import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mergeSchedule, type ScheduleFilters } from "@/lib/schedule-report";

type Viewer = { id: string; role: "SUPER_ADMIN" | "STAFF" };

export async function getStaffSchedule(viewer: Viewer, filters: ScheduleFilters, transaction?: Prisma.TransactionClient) {
  // The authenticated viewer controls scope; employee IDs from URLs never widen it.
  const staffId = viewer.role === "SUPER_ADMIN" ? filters.staffId : viewer.id;
  const endExclusive = new Date(`${filters.to}T00:00:00Z`);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const caregiverFilter: Prisma.CBHSEntryWhereInput = staffId ? { OR: [
    { shiftStaffId: staffId },
    { shiftStaffId: null, shift: "FIRST", firstShiftStaffId: staffId },
    { shiftStaffId: null, shift: "SECOND", secondShiftStaffId: staffId },
    { shiftStaffId: null, shift: "FIRST", firstShiftStaffId: null, staffId },
    { shiftStaffId: null, shift: "SECOND", secondShiftStaffId: null, staffId },
    { shiftStaffId: null, shift: "THIRD", staffId }
  ] } : {};
  const staffSelect = { id: true, name: true, role: true, isActive: true } as const;
  const read = async (db: Prisma.TransactionClient) => {
  const [manual, logs, templates, revoked] = await Promise.all([
    db.shiftAssignment.findMany({
      where: { date: { gte: filters.from, lte: filters.to }, ...(staffId ? { staffId } : {}), ...(filters.shift ? { shift: filters.shift } : {}), ...(filters.workShiftId ? { workShiftId: filters.workShiftId } : {}) },
      include: { staff: { select: { name: true, isActive: true } } }
    }),
    // Query current logs each time, so edits/deletes/re-adds immediately affect the schedule.
    // No narratives or client names are needed for staffing reports.
    db.cBHSEntry.findMany({
      where: { date: { gte: new Date(`${filters.from}T00:00:00Z`), lt: endExclusive }, status: "SIGNED", ...(filters.shift ? { shift: filters.shift } : {}), ...caregiverFilter },
      select: { date: true, shift: true, clientId: true, staff: { select: staffSelect }, shiftStaff: { select: staffSelect }, firstShiftStaff: { select: staffSelect }, secondShiftStaff: { select: staffSelect } }
    }),
    db.workShift.findMany(),
    db.shiftRevocation.findMany({ where: { date: { gte: filters.from, lte: filters.to }, ...(staffId ? { staffId } : {}) } })
  ]);
  return mergeSchedule(manual, logs, templates, revoked).filter((row) => !filters.workShiftId || row.workShiftId === filters.workShiftId);
  };
  return transaction ? read(transaction) : prisma.$transaction(read);
}
