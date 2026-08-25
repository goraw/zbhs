import crypto from "node:crypto";
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

function temporaryPassword() {
  return `ZBHS-${crypto.randomBytes(4).toString("hex")}-Temp!`;
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

async function main() {
  const createdPasswords: Array<{ name: string; username: string; password: string }> = [];
  const users = new Map<StaffKey, { id: string; name: string }>();

  for (const [key, staff] of Object.entries(staffRoster) as Array<[StaffKey, (typeof staffRoster)[StaffKey]]>) {
    const existing = await prisma.user.findUnique({ where: { username: staff.username }, select: { id: true, name: true } });

    if (existing) {
      const updated = await prisma.user.update({
        where: { username: staff.username },
        data: { name: staff.name, role: "STAFF", isActive: true },
        select: { id: true, name: true }
      });
      users.set(key, updated);
      continue;
    }

    const password = temporaryPassword();
    const passwordHash = await bcrypt.hash(password, 12);
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

    createdPasswords.push({ ...staff, password });
    users.set(key, created);
  }

  const entries = await prisma.cBHSEntry.findMany({
    select: { id: true, date: true },
    orderBy: { date: "asc" }
  });

  const counts = new Map<string, number>();

  for (const entry of entries) {
    const assignment = shiftAssignment(entry.date);
    const firstShiftStaffId = users.get(assignment.first)?.id;
    const secondShiftStaffId = users.get(assignment.second)?.id;

    if (!firstShiftStaffId || !secondShiftStaffId) {
      throw new Error(`Missing staff ID for assignment on ${dateKey(entry.date)}.`);
    }

    await prisma.cBHSEntry.update({
      where: { id: entry.id },
      data: { firstShiftStaffId, secondShiftStaffId }
    });

    const label = `${staffRoster[assignment.first].name} / ${staffRoster[assignment.second].name}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  console.log(JSON.stringify({
    createdUsers: createdPasswords,
    updatedEntries: entries.length,
    assignmentCounts: Object.fromEntries(counts)
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
