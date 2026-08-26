import { prisma } from "@/lib/prisma";

type Shift = "FIRST" | "SECOND" | "THIRD";

type EntryForNormalization = {
  id: string;
  shift: Shift;
  servicePeriods: string;
  behaviorFrequencies: string;
  client: { name: string };
};

type ServicePeriod = {
  text: string;
  startMinutes: number;
  endMinutes: number;
};

function parseFrequencies(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, String(item ?? "").trim()]));
  } catch {
    return {};
  }
}

function timeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (hours === 12) hours = 0;
  return (meridiem === "PM" ? hours + 12 : hours) * 60 + minutes;
}

function relativeMinutes(minutes: number, shift: Shift) {
  if (shift !== "THIRD") return minutes;
  return minutes < 6 * 60 ? minutes + 24 * 60 : minutes;
}

function parseServicePeriods(value: string, shift: Shift) {
  return value
    .split(/[\n,;]+/)
    .map((period) => period.trim())
    .filter(Boolean)
    .map((period): ServicePeriod | null => {
      const [start, end] = period.split(/\s*-\s*/);
      const startMinutes = start ? timeToMinutes(start) : null;
      const endMinutes = end ? timeToMinutes(end) : null;
      if (startMinutes === null || endMinutes === null) return null;

      return {
        text: `${start.trim()}-${end.trim()}`,
        startMinutes: relativeMinutes(startMinutes, shift),
        endMinutes: relativeMinutes(endMinutes, shift)
      };
    })
    .filter((period): period is ServicePeriod => Boolean(period));
}

function isInsideShift(period: ServicePeriod, shift: Shift) {
  if (period.endMinutes <= period.startMinutes) return false;
  if (shift === "FIRST") return period.startMinutes >= 6 * 60 && period.endMinutes <= 14 * 60;
  if (shift === "SECOND") return period.startMinutes >= 16 * 60 && period.endMinutes <= 22 * 60;
  return period.startMinutes >= 22 * 60 && period.endMinutes <= 30 * 60;
}

function defaultPeriod(entry: EntryForNormalization) {
  const frequencies = parseFrequencies(entry.behaviorFrequencies);
  const hasFive = Number(frequencies["5"]) > 0;

  if (entry.shift === "FIRST") return hasFive ? "8AM-9AM" : "6:30AM-7:30AM";
  if (entry.shift === "SECOND") return "6PM-7PM";
  return "10PM-11PM";
}

async function main() {
  const entries = await prisma.cBHSEntry.findMany({
    select: {
      id: true,
      shift: true,
      servicePeriods: true,
      behaviorFrequencies: true,
      client: { select: { name: true } }
    },
    orderBy: [{ date: "asc" }, { shift: "asc" }]
  });

  let updatedEntries = 0;
  const updatedByShift = new Map<string, number>();
  const updatedByClient = new Map<string, number>();

  for (const entry of entries) {
    const periods = parseServicePeriods(entry.servicePeriods, entry.shift);
    const validPeriods = periods.filter((period) => isInsideShift(period, entry.shift));
    const nextServicePeriods = validPeriods.length ? validPeriods.map((period) => period.text).join(", ") : defaultPeriod(entry);

    if (entry.servicePeriods === nextServicePeriods) continue;

    await prisma.cBHSEntry.update({
      where: { id: entry.id },
      data: { servicePeriods: nextServicePeriods }
    });

    updatedEntries += 1;
    updatedByShift.set(entry.shift, (updatedByShift.get(entry.shift) ?? 0) + 1);
    updatedByClient.set(entry.client.name, (updatedByClient.get(entry.client.name) ?? 0) + 1);
  }

  console.log(JSON.stringify({
    scannedEntries: entries.length,
    updatedEntries,
    updatedByShift: Object.fromEntries(updatedByShift),
    updatedByClient: Object.fromEntries(updatedByClient)
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
