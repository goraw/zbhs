import { ShiftPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type StaffKey = "fikiraddis" | "abyot" | "colletar" | "kidist" | "zillah";
type StaffRecord = { id: string; name: string };

const staffRoster: Record<StaffKey, { name: string; username: string }> = {
  fikiraddis: { name: "Fikiraddis Worku", username: "fikiraddis.worku" },
  abyot: { name: "Abyot Seid", username: "abyot.seid" },
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

function staffKeyForEntry(date: Date, shift: ShiftPeriod): StaffKey {
  const value = dateKey(date);
  const isWednesday = date.getUTCDay() === 3;

  if (shift === "THIRD") return "kidist";

  if (value >= "2024-12-23" && value <= "2025-01-10") {
    return shift === "FIRST" ? "kidist" : "colletar";
  }

  if (value >= "2026-08-04" && value <= "2026-08-10") {
    return shift === "FIRST" ? "kidist" : "zillah";
  }

  if (shift === "FIRST") return "fikiraddis";
  return value >= "2026-05-01" ? "abyot" : isWednesday ? "colletar" : "kidist";
}

async function loadStaff() {
  const staff = new Map<StaffKey, StaffRecord>();

  for (const [key, rosterEntry] of Object.entries(staffRoster) as Array<[StaffKey, (typeof staffRoster)[StaffKey]]>) {
    const user = await prisma.user.findFirst({
      where: { username: rosterEntry.username, role: "STAFF", isActive: true },
      select: { id: true, name: true }
    });

    if (!user) {
      throw new Error(`${rosterEntry.name} (${rosterEntry.username}) was not found as an active staff user.`);
    }

    staff.set(key, user);
  }

  return staff;
}

async function main() {
  const staff = await loadStaff();
  const entries = await prisma.cBHSEntry.findMany({
    select: { id: true, date: true, shift: true, staffId: true, shiftStaffId: true, firstShiftStaffId: true, secondShiftStaffId: true, signatureText: true },
    orderBy: [{ date: "asc" }, { shift: "asc" }]
  });

  const assignmentCounts = new Map<string, number>();
  let updatedEntries = 0;

  for (const entry of entries) {
    const staffKey = staffKeyForEntry(entry.date, entry.shift);
    const assignedStaff = staff.get(staffKey);
    if (!assignedStaff) throw new Error(`Missing loaded staff record for ${staffKey}.`);

    const nextData = {
      staffId: assignedStaff.id,
      shiftStaffId: assignedStaff.id,
      firstShiftStaffId: entry.shift === "FIRST" ? assignedStaff.id : null,
      secondShiftStaffId: entry.shift === "SECOND" ? assignedStaff.id : null,
      signatureText: initials(assignedStaff.name)
    };

    const changed =
      entry.staffId !== nextData.staffId ||
      entry.shiftStaffId !== nextData.shiftStaffId ||
      entry.firstShiftStaffId !== nextData.firstShiftStaffId ||
      entry.secondShiftStaffId !== nextData.secondShiftStaffId ||
      entry.signatureText !== nextData.signatureText;

    if (!changed) continue;

    await prisma.cBHSEntry.update({
      where: { id: entry.id },
      data: nextData
    });

    updatedEntries += 1;
    const label = `${entry.shift}: ${assignedStaff.name}`;
    assignmentCounts.set(label, (assignmentCounts.get(label) ?? 0) + 1);
  }

  console.log(JSON.stringify({ scannedEntries: entries.length, updatedEntries, assignmentCounts: Object.fromEntries(assignmentCounts) }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
