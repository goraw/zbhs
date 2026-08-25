import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

type StaffKey = "fikiraddis" | "colletar" | "kidist" | "zillah";

const staffRoster: Record<StaffKey, { name: string; username: string }> = {
  fikiraddis: { name: "Fikiraddis Worku", username: "fikiraddis.worku" },
  colletar: { name: "COLLETAR CHISANU", username: "colletar.chisanu" },
  kidist: { name: "Kidist Wolemicheal", username: "kidist.wolemicheal" },
  zillah: { name: "Zillah Jombee", username: "zillah.jombee" }
};

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

function shiftAssignment(date: Date) {
  const value = dateKey(date);
  const isWednesday = date.getUTCDay() === 3;

  if (value >= "2024-12-23" && value <= "2025-01-10") {
    return { first: "colletar" as const, second: "kidist" as const };
  }

  if (value >= "2026-08-04" && value <= "2026-08-10") {
    return { first: "zillah" as const, second: "kidist" as const };
  }

  return {
    first: "fikiraddis" as const,
    second: isWednesday ? "kidist" as const : value >= "2026-06-01" ? "zillah" as const : "colletar" as const
  };
}

async function ensureStaffUsers() {
  const users = new Map<StaffKey, { id: string; name: string }>();

  for (const [key, staff] of Object.entries(staffRoster) as Array<[StaffKey, (typeof staffRoster)[StaffKey]]>) {
    const existing = await prisma.user.findUnique({
      where: { username: staff.username },
      select: { id: true, name: true }
    });

    if (existing) {
      users.set(key, existing);
      continue;
    }

    const passwordHash = await bcrypt.hash(`ZBHS-${staff.username}-Temp!`, 12);
    const created = await prisma.user.create({
      data: {
        name: staff.name,
        username: staff.username,
        passwordHash,
        role: "STAFF",
        isActive: true,
        forcePasswordReset: true
      },
      select: { id: true, name: true }
    });
    users.set(key, created);
  }

  return users;
}

async function main() {
  const users = await ensureStaffUsers();
  const entries = await prisma.cBHSEntry.findMany({
    orderBy: [{ clientId: "asc" }, { date: "asc" }, { createdAt: "asc" }]
  });
  const groups = new Map<string, typeof entries>();

  for (const entry of entries) {
    const key = `${entry.clientId}:${dateKey(entry.date)}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }

  let updatedFirstShift = 0;
  let updatedSecondShift = 0;
  let createdSecondShift = 0;

  for (const groupEntries of groups.values()) {
    const source = groupEntries[0];
    const assignment = shiftAssignment(source.date);
    const firstStaff = users.get(assignment.first);
    const secondStaff = users.get(assignment.second);
    if (!firstStaff || !secondStaff) throw new Error(`Missing staff assignment for ${dateKey(source.date)}.`);

    const firstEntry = groupEntries.find((entry) => entry.shift === "FIRST") ?? source;
    const secondEntry = groupEntries.find((entry) => entry.shift === "SECOND");

    await prisma.cBHSEntry.update({
      where: { id: firstEntry.id },
      data: {
        staffId: firstStaff.id,
        shift: "FIRST",
        shiftStaffId: firstStaff.id,
        firstShiftStaffId: firstStaff.id,
        secondShiftStaffId: null,
        servicePeriods: "6AM-6PM",
        signatureText: initials(firstStaff.name)
      }
    });
    updatedFirstShift += 1;

    if (secondEntry) {
      await prisma.cBHSEntry.update({
        where: { id: secondEntry.id },
        data: {
          staffId: secondStaff.id,
          shift: "SECOND",
          shiftStaffId: secondStaff.id,
          firstShiftStaffId: null,
          secondShiftStaffId: secondStaff.id,
          servicePeriods: "6PM-6AM",
          signatureText: initials(secondStaff.name)
        }
      });
      updatedSecondShift += 1;
      continue;
    }

    await prisma.cBHSEntry.create({
      data: {
        clientId: source.clientId,
        staffId: secondStaff.id,
        shift: "SECOND",
        shiftStaffId: secondStaff.id,
        firstShiftStaffId: null,
        secondShiftStaffId: secondStaff.id,
        date: source.date,
        startTime: source.startTime,
        endTime: source.endTime,
        durationMinutes: source.durationMinutes,
        servicePeriods: "6PM-6AM",
        behaviorFrequencies: "{}",
        triggers: "",
        staffInterventions: "",
        outcome: "",
        summativeNote: "",
        signatureText: initials(secondStaff.name),
        signatureTimestamp: source.signatureTimestamp ?? new Date(),
        status: source.status
      }
    });
    createdSecondShift += 1;
  }

  console.log(JSON.stringify({ updatedFirstShift, updatedSecondShift, createdSecondShift }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
