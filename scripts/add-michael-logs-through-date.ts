import { prisma } from "@/lib/prisma";

const targetDate = "2026-08-26";

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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function midnight(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function isWednesday(date: Date) {
  return date.getUTCDay() === 3;
}

function staffAssignment(date: Date) {
  const value = dateKey(date);
  const isWednesdayDate = isWednesday(date);

  if (value >= "2024-12-23" && value <= "2025-01-10") {
    return { first: "kidist" as const, second: "colletar" as const };
  }

  if (value >= "2026-08-04" && value <= "2026-08-10") {
    return { first: "kidist" as const, second: "zillah" as const };
  }

  return {
    first: "fikiraddis" as const,
    second: value >= "2026-05-01" ? "abyot" as const : isWednesdayDate ? "colletar" as const : "kidist" as const
  };
}

async function main() {
  const [michael, fikiraddis, abyot, zillah, kidist, colletar] = await Promise.all([
    prisma.client.findFirst({ where: { name: "Michael Brown" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "fikiraddis.worku", isActive: true, role: "STAFF" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "abyot.seid", isActive: true, role: "STAFF" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "zillah.jombee", isActive: true, role: "STAFF" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "kidist.wolemicheal", isActive: true, role: "STAFF" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "colletar.chisanu", isActive: true, role: "STAFF" }, select: { id: true, name: true } })
  ]);

  if (!michael) throw new Error("Michael Brown client record was not found.");
  if (!fikiraddis || !abyot || !zillah || !kidist || !colletar) throw new Error("Required staff record was not found.");
  const staffByKey = { fikiraddis, abyot, zillah, kidist, colletar };

  const latest = await prisma.cBHSEntry.findFirst({
    where: { clientId: michael.id },
    orderBy: { date: "desc" },
    select: { date: true, startTime: true, endTime: true, durationMinutes: true, status: true, signatureTimestamp: true }
  });
  if (!latest) throw new Error("Michael Brown has no source logs.");

  let cursor = addDays(latest.date, 1);
  const end = midnight(targetDate);
  let createdFirstShift = 0;
  let createdSecondShift = 0;
  let skippedExisting = 0;

  while (cursor <= end) {
    const key = dateKey(cursor);
    const existing = await prisma.cBHSEntry.findMany({
      where: { clientId: michael.id, date: cursor },
      select: { shift: true }
    });
    const shifts = new Set(existing.map((entry) => entry.shift));
    const assignment = staffAssignment(cursor);
    const firstStaff = staffByKey[assignment.first];
    const secondStaff = staffByKey[assignment.second];

    if (!shifts.has("FIRST")) {
      await prisma.cBHSEntry.create({
        data: {
          clientId: michael.id,
          staffId: firstStaff.id,
          shift: "FIRST",
          shiftStaffId: firstStaff.id,
          firstShiftStaffId: firstStaff.id,
          secondShiftStaffId: null,
          date: cursor,
          startTime: latest.startTime,
          endTime: latest.endTime,
          durationMinutes: latest.durationMinutes,
          servicePeriods: "6:30AM-7:30AM, 12PM-1PM",
          behaviorFrequencies: JSON.stringify({ "5": "2" }),
          triggers: "",
          staffInterventions: "",
          outcome: "",
          summativeNote: "",
          signatureText: initials(firstStaff.name),
          signatureTimestamp: latest.signatureTimestamp ?? new Date(),
          status: latest.status
        }
      });
      createdFirstShift += 1;
    } else {
      skippedExisting += 1;
    }

    if (!shifts.has("SECOND")) {
      await prisma.cBHSEntry.create({
        data: {
          clientId: michael.id,
          staffId: secondStaff.id,
          shift: "SECOND",
          shiftStaffId: secondStaff.id,
          firstShiftStaffId: null,
          secondShiftStaffId: secondStaff.id,
          date: cursor,
          startTime: latest.startTime,
          endTime: latest.endTime,
          durationMinutes: latest.durationMinutes,
          servicePeriods: "6PM-7PM",
          behaviorFrequencies: JSON.stringify({ "5": "1" }),
          triggers: "",
          staffInterventions: "",
          outcome: "",
          summativeNote: "",
          signatureText: initials(secondStaff.name),
          signatureTimestamp: latest.signatureTimestamp ?? new Date(),
          status: latest.status
        }
      });
      createdSecondShift += 1;
    } else {
      skippedExisting += 1;
    }

    cursor = addDays(cursor, 1);
  }

  console.log(JSON.stringify({
    client: michael.name,
    throughDate: targetDate,
    createdFirstShift,
    createdSecondShift,
    skippedExisting
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
