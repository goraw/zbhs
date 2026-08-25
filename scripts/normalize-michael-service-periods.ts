import { prisma } from "@/lib/prisma";

const firstShiftBasePeriods = ["6:30AM-7:30AM", "12PM-1PM"];
const secondShiftBasePeriods = ["6PM-7PM"];
const occasionalFirstShiftPeriod = "3PM-4PM";
const occasionalSecondShiftPeriod = "9PM-10PM";
const occasionalLines = ["3", "6", "7"];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 3);
}

function frequencyPayload(frequencies: Record<string, string>) {
  return JSON.stringify(frequencies);
}

function occasionalLineForDate(date: Date) {
  const dayOfYear = Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 86_400_000);
  if (dayOfYear % 6 !== 0) return null;
  return occasionalLines[dayOfYear % occasionalLines.length];
}

async function main() {
  const michael = await prisma.client.findFirst({
    where: { name: "Michael Brown" },
    select: { id: true, name: true }
  });
  if (!michael) throw new Error("Michael Brown client record was not found.");

  const entries = await prisma.cBHSEntry.findMany({
    where: { clientId: michael.id },
    include: { shiftStaff: true, staff: true },
    orderBy: [{ date: "asc" }, { shift: "asc" }]
  });
  const groups = new Map<string, typeof entries>();

  for (const entry of entries) {
    const key = dateKey(entry.date);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  let updatedFirstShift = 0;
  let updatedSecondShift = 0;

  for (const group of groups.values()) {
    const first = group.find((entry) => entry.shift === "FIRST");
    const second = group.find((entry) => entry.shift === "SECOND");
    const sourceDate = first?.date ?? second?.date;
    if (!sourceDate) continue;

    const occasionalLine = occasionalLineForDate(sourceDate);

    if (first) {
      const firstPeriods = [...firstShiftBasePeriods];
      const firstFrequencies: Record<string, string> = { "5": "2" };
      if (occasionalLine) {
        firstPeriods.push(occasionalFirstShiftPeriod);
        firstFrequencies[occasionalLine] = "1";
      }

      await prisma.cBHSEntry.update({
        where: { id: first.id },
        data: {
          servicePeriods: firstPeriods.join(", "),
          behaviorFrequencies: frequencyPayload(firstFrequencies),
          signatureText: initials(first.shiftStaff?.name ?? first.staff.name)
        }
      });
      updatedFirstShift += 1;
    }

    if (second) {
      const secondPeriods = [...secondShiftBasePeriods];
      const secondFrequencies: Record<string, string> = { "5": "1" };
      if (occasionalLine && Number(sourceDate.toISOString().slice(8, 10)) % 2 === 0) {
        secondPeriods.push(occasionalSecondShiftPeriod);
        secondFrequencies["7"] = "1";
      }

      await prisma.cBHSEntry.update({
        where: { id: second.id },
        data: {
          servicePeriods: secondPeriods.join(", "),
          behaviorFrequencies: frequencyPayload(secondFrequencies),
          signatureText: initials(second.shiftStaff?.name ?? second.staff.name)
        }
      });
      updatedSecondShift += 1;
    }
  }

  console.log(JSON.stringify({ client: michael.name, updatedFirstShift, updatedSecondShift }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
