import { prisma } from "@/lib/prisma";

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

function thirdShiftDates(sortedDates: Date[]) {
  const selected = new Set<string>();
  let index = 0;
  let useThreeDayGap = true;

  while (index < sortedDates.length) {
    index += useThreeDayGap ? 2 : 3;
    if (index < sortedDates.length) selected.add(dateKey(sortedDates[index]));
    useThreeDayGap = !useThreeDayGap;
  }

  return selected;
}

async function main() {
  const [michael, colletar, zillah] = await Promise.all([
    prisma.client.findFirst({ where: { name: "Michael Brown" }, select: { id: true, name: true } }),
    prisma.user.findFirst({
      where: { username: "colletar.chisanu", isActive: true, role: "STAFF" },
      select: { id: true, name: true }
    }),
    prisma.user.findFirst({
      where: { username: "zillah.jombee", isActive: true, role: "STAFF" },
      select: { id: true, name: true }
    })
  ]);

  if (!michael) throw new Error("Michael Brown client record was not found.");
  if (!colletar || !zillah) throw new Error("Required third-shift staff record was not found.");

  const existingEntries = await prisma.cBHSEntry.findMany({
    where: { clientId: michael.id },
    orderBy: [{ date: "asc" }, { shift: "asc" }]
  });
  const byDate = new Map<string, typeof existingEntries>();

  for (const entry of existingEntries) {
    const key = dateKey(entry.date);
    byDate.set(key, [...(byDate.get(key) ?? []), entry]);
  }

  const selectedDates = thirdShiftDates(
    Array.from(byDate.keys())
      .sort()
      .map((value) => new Date(`${value}T00:00:00.000Z`))
  );

  let createdThirdShift = 0;
  let existingThirdShift = 0;
  let skippedNoIssue = 0;

  for (const [key, entries] of byDate) {
    if (entries.some((entry) => entry.shift === "THIRD")) {
      existingThirdShift += 1;
      continue;
    }

    if (!selectedDates.has(key)) {
      skippedNoIssue += 1;
      continue;
    }

    const source = entries.find((entry) => entry.shift === "FIRST") ?? entries[0];
    const thirdShiftStaff = key >= "2026-05-01" ? zillah : colletar;
    await prisma.cBHSEntry.create({
      data: {
        clientId: source.clientId,
        staffId: thirdShiftStaff.id,
        shift: "THIRD",
        shiftStaffId: thirdShiftStaff.id,
        firstShiftStaffId: null,
        secondShiftStaffId: null,
        date: source.date,
        startTime: source.startTime,
        endTime: source.endTime,
        durationMinutes: source.durationMinutes,
        servicePeriods: "6PM-7PM",
        behaviorFrequencies: JSON.stringify({ "5": "1" }),
        triggers: "",
        staffInterventions: "",
        outcome: "",
        summativeNote: "",
        signatureText: initials(thirdShiftStaff.name),
        signatureTimestamp: source.signatureTimestamp ?? new Date(),
        status: source.status
      }
    });
    createdThirdShift += 1;
  }

  console.log(JSON.stringify({
    client: michael.name,
    thirdShiftStaffRule: "COLLETAR CHISANU before 2026-05-01; Zillah Jombee from 2026-05-01 onward",
    createdThirdShift,
    existingThirdShift,
    skippedNoIssue
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
