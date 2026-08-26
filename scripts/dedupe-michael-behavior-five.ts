import { prisma } from "@/lib/prisma";

type EntryForCorrection = {
  id: string;
  date: Date;
  shift: "FIRST" | "SECOND" | "THIRD";
  servicePeriods: string;
  behaviorFrequencies: string;
  createdAt: Date;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseFrequencies(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, String(item ?? "").trim()]));
  } catch {
    return {};
  }
}

function stringifyFrequencies(frequencies: Record<string, string>) {
  const cleaned = Object.fromEntries(
    Object.entries(frequencies).filter(([, value]) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0;
    })
  );

  return JSON.stringify(cleaned);
}

function hasBehaviorFive(entry: EntryForCorrection) {
  const frequencies = parseFrequencies(entry.behaviorFrequencies);
  const value = Number(frequencies["5"]);
  return Number.isFinite(value) && value > 0;
}

function otherBehaviorCount(entry: EntryForCorrection) {
  const frequencies = parseFrequencies(entry.behaviorFrequencies);
  return Object.entries(frequencies).filter(([line, value]) => line !== "5" && Number(value) > 0).length;
}

function chooseKeptEntry(entries: EntryForCorrection[]) {
  const withoutBehaviorThree = entries.filter((entry) => !parseFrequencies(entry.behaviorFrequencies)["3"]);
  const candidates = withoutBehaviorThree.length ? withoutBehaviorThree : entries;

  const preferredShift = candidates.find((entry) => entry.shift === "FIRST");
  if (preferredShift) return preferredShift;

  return candidates[0];
}

async function main() {
  const michael = await prisma.client.findFirst({
    where: { name: "Michael Brown" },
    select: { id: true, name: true }
  });

  if (!michael) throw new Error("Michael Brown client record was not found.");

  const entries = await prisma.cBHSEntry.findMany({
    where: { clientId: michael.id },
    select: {
      id: true,
      date: true,
      shift: true,
      servicePeriods: true,
      behaviorFrequencies: true,
      createdAt: true
    },
    orderBy: [{ date: "asc" }, { shift: "asc" }, { createdAt: "asc" }]
  });

  const entriesByDate = new Map<string, EntryForCorrection[]>();
  for (const entry of entries) {
    if (!hasBehaviorFive(entry)) continue;

    const key = dateKey(entry.date);
    entriesByDate.set(key, [...(entriesByDate.get(key) ?? []), entry]);
  }

  let updatedEntries = 0;
  let deletedEntries = 0;
  let strippedBehaviorFive = 0;
  const keptByPeriod = new Map<string, number>();

  const sortedDates = [...entriesByDate.keys()].sort();
  for (const [index, key] of sortedDates.entries()) {
    const dailyEntries = entriesByDate.get(key) ?? [];
    if (!dailyEntries.length) continue;

    // Keep a midday #5 record on a small, deterministic subset of dates to reflect sporadic midday-only documentation.
    const keepMidday = index % 5 === 2;
    const keptEntry = chooseKeptEntry(dailyEntries);
    const keptPeriod = keepMidday ? "12PM-1PM" : "8AM-9AM";

    for (const entry of dailyEntries) {
      const frequencies = parseFrequencies(entry.behaviorFrequencies);

      if (entry.id === keptEntry.id) {
        frequencies["5"] = "1";
        const nextFrequencies = stringifyFrequencies(frequencies);
        const needsUpdate = entry.behaviorFrequencies !== nextFrequencies || entry.servicePeriods !== keptPeriod;

        if (needsUpdate) {
          await prisma.cBHSEntry.update({
            where: { id: entry.id },
            data: {
              behaviorFrequencies: nextFrequencies,
              servicePeriods: keptPeriod
            }
          });
          updatedEntries += 1;
        }

        keptByPeriod.set(keptPeriod, (keptByPeriod.get(keptPeriod) ?? 0) + 1);
        continue;
      }

      delete frequencies["5"];
      if (otherBehaviorCount(entry) === 0) {
        await prisma.cBHSEntry.delete({ where: { id: entry.id } });
        deletedEntries += 1;
      } else {
        await prisma.cBHSEntry.update({
          where: { id: entry.id },
          data: { behaviorFrequencies: stringifyFrequencies(frequencies) }
        });
        strippedBehaviorFive += 1;
      }
    }
  }

  console.log(JSON.stringify({
    client: michael.name,
    datesWithBehaviorFive: sortedDates.length,
    updatedEntries,
    deletedEntries,
    strippedBehaviorFive,
    keptByPeriod: Object.fromEntries(keptByPeriod)
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
