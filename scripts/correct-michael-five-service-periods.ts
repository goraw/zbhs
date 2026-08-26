import { ShiftPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const behaviorFivePeriods = ["8AM-9AM", "12PM-1PM", "6PM-7PM"];

function parseFrequencies(value: string) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, String(item ?? "").trim()]));
  } catch {
    return {};
  }
}

function servicePeriodsForFive(frequency: number, shift: ShiftPeriod) {
  if (shift === "THIRD") return ["4PM-5PM"];
  if (frequency >= 3) return behaviorFivePeriods;
  if (frequency === 2) {
    return shift === "FIRST" ? behaviorFivePeriods.slice(0, 2) : behaviorFivePeriods.slice(1, 3);
  }
  return [shift === "FIRST" ? behaviorFivePeriods[0] : behaviorFivePeriods[2]];
}

async function main() {
  const michael = await prisma.client.findFirst({
    where: { name: "Michael Brown" },
    select: { id: true, name: true }
  });
  if (!michael) throw new Error("Michael Brown client record was not found.");

  const entries = await prisma.cBHSEntry.findMany({
    where: { clientId: michael.id },
    select: { id: true, date: true, shift: true, behaviorFrequencies: true, servicePeriods: true },
    orderBy: [{ date: "asc" }, { shift: "asc" }]
  });

  let updatedEntries = 0;
  let skippedBehaviorThree = 0;
  let skippedNoFive = 0;
  const assignmentCounts = new Map<string, number>();

  for (const entry of entries) {
    const frequencies = parseFrequencies(entry.behaviorFrequencies);
    if (frequencies["3"]) {
      skippedBehaviorThree += 1;
      continue;
    }

    const fiveFrequency = Number(frequencies["5"]);
    if (!Number.isFinite(fiveFrequency) || fiveFrequency <= 0) {
      skippedNoFive += 1;
      continue;
    }

    const nextServicePeriods = servicePeriodsForFive(fiveFrequency, entry.shift).join(", ");
    if (entry.servicePeriods === nextServicePeriods) continue;

    await prisma.cBHSEntry.update({
      where: { id: entry.id },
      data: { servicePeriods: nextServicePeriods }
    });

    updatedEntries += 1;
    assignmentCounts.set(nextServicePeriods, (assignmentCounts.get(nextServicePeriods) ?? 0) + 1);
  }

  console.log(JSON.stringify({
    client: michael.name,
    scannedEntries: entries.length,
    updatedEntries,
    skippedBehaviorThree,
    skippedNoFive,
    assignmentCounts: Object.fromEntries(assignmentCounts)
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
