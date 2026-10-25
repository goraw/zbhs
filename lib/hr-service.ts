import "server-only";
import type { Prisma } from "@prisma/client";
import { getStaffSchedule } from "@/lib/staff-schedule";
import { coverageGaps, dayOffset, localToday, shiftsOverlap, timeLabel } from "@/lib/hr";

export type AssignmentKey = { staffId: string; date: string; workShiftId: string };

export async function assignStaffShift(tx: Prisma.TransactionClient, actorId: string, key: AssignmentKey) {
  const [staff, shift] = await Promise.all([
    tx.user.findFirst({ where: { id: key.staffId, role: "STAFF", isActive: true } }),
    tx.workShift.findFirst({ where: { id: key.workShiftId, isActive: true } })
  ]);
  if (!staff || !shift) throw new Error("Choose an active staff member and shift.");
  const rows = await getStaffSchedule({ id: actorId, role: "SUPER_ADMIN" }, { from: dayOffset(key.date, -1), to: dayOffset(key.date, 1), staffId: staff.id, shift: "" }, tx);
  if (rows.some((row) => row.date === key.date && row.workShiftId === key.workShiftId)) throw new Error("This staff member is already assigned to this shift.");
  if (rows.some((row) => shiftsOverlap(key.date, shift, row.date, row))) throw new Error("This staff member has an overlapping shift, including overnight coverage.");
  await tx.shiftRevocation.deleteMany({ where: key });
  await tx.shiftAssignment.create({ data: { ...key, shift: shift.legacyShift } });
  await tx.auditLog.create({ data: { userId: actorId, action: "ASSIGN_SHIFT", details: `Assigned staff ${key.staffId} to ${key.workShiftId} on ${key.date}.` } });
}

export async function revokeStaffShift(tx: Prisma.TransactionClient, actorId: string, key: AssignmentKey) {
  // A durable HR override prevents clinical synchronization restoring a revoked assignment.
  await tx.shiftAssignment.deleteMany({ where: key });
  await tx.shiftRevocation.upsert({ where: { staffId_date_workShiftId: key }, create: key, update: {} });
  await tx.auditLog.create({ data: { userId: actorId, action: "REVOKE_SHIFT", details: `Revoked staff ${key.staffId} from ${key.workShiftId} on ${key.date}.` } });
}

export async function retireWorkShift(tx: Prisma.TransactionClient, actorId: string, id: string) {
  const shifts = await tx.workShift.findMany({ where: { isActive: true } });
  if (!shifts.some((shift) => shift.id === id)) throw new Error("This shift is already removed.");
  const gaps = coverageGaps(shifts.filter((shift) => shift.id !== id));
  if (gaps.length) throw new Error(`Add replacement coverage first. Removing this shift leaves ${gaps.map((gap) => `${timeLabel(gap.start)}-${timeLabel(gap.end)}`).join(", ")} uncovered.`);
  if (await tx.shiftAssignment.count({ where: { workShiftId: id, date: { gte: localToday() } } })) throw new Error("Revoke today's and future assignments for this shift before removing it.");
  // Historical reports retain their original shift when a shift is removed from the roster.
  await tx.workShift.update({ where: { id }, data: { isActive: false } });
  await tx.auditLog.create({ data: { userId: actorId, action: "REMOVE_WORK_SHIFT", details: `Removed shift ${id} from active roster.` } });
}
