import type { ShiftPeriod } from "@prisma/client";

export type WorkShiftData = { id: string; name: string; startMinute: number; endMinute: number; minimumStaff: number; isActive: boolean; legacyShift: ShiftPeriod | null };
export const defaultWorkShifts: WorkShiftData[] = [
  { id: "hr-first", name: "First shift", startMinute: 360, endMinute: 840, minimumStaff: 1, isActive: true, legacyShift: "FIRST" },
  { id: "hr-second", name: "Second shift", startMinute: 840, endMinute: 1320, minimumStaff: 1, isActive: true, legacyShift: "SECOND" },
  { id: "hr-third", name: "Night shift", startMinute: 1320, endMinute: 360, minimumStaff: 1, isActive: true, legacyShift: "THIRD" }
];

export function timeLabel(minute: number) {
  const value = minute % 1440;
  return `${Math.floor(value / 60) % 12 || 12}${value % 60 ? ":" + String(value % 60).padStart(2, "0") : ""}${value < 720 ? "AM" : "PM"}`;
}
export function shiftTime(shift: { startMinute: number; endMinute: number }) {
  return `${timeLabel(shift.startMinute)}-${timeLabel(shift.endMinute)}${shift.endMinute < shift.startMinute ? " (+1 day)" : ""}`;
}
export function shiftHours(shift: { startMinute: number; endMinute: number }) {
  return ((shift.endMinute - shift.startMinute + 1440) % 1440) / 60;
}
export function dayOffset(date: string, count: number) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + count);
  return day.toISOString().slice(0, 10);
}
export function localToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export function weekDays(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  const monday = dayOffset(value, -((date.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => dayOffset(monday, index));
}

export function coverageGaps(shifts: WorkShiftData[]) {
  const covered = new Uint8Array(1440);
  for (const shift of shifts.filter((item) => item.isActive)) {
    for (let minute = shift.startMinute; minute < shift.startMinute + shiftHours(shift) * 60; minute++) covered[minute % 1440] = 1;
  }
  const gaps: { start: number; end: number }[] = [];
  for (let minute = 0; minute < 1440;) {
    if (covered[minute]) { minute++; continue; }
    const start = minute;
    while (minute < 1440 && !covered[minute]) minute++;
    gaps.push({ start, end: minute });
  }
  return gaps;
}

export function shiftsOverlap(aDate: string, a: { startMinute: number; endMinute: number }, bDate: string, b: { startMinute: number; endMinute: number }) {
  const aStart = Date.parse(aDate) / 60000 + a.startMinute;
  const bStart = Date.parse(bDate) / 60000 + b.startMinute;
  return aStart < bStart + shiftHours(b) * 60 && bStart < aStart + shiftHours(a) * 60;
}

export function openShiftSlots(days: string[], shifts: WorkShiftData[], assignments: { date: string; workShiftId: string; staffId: string }[]) {
  return days.flatMap((date) => shifts.filter((shift) => shift.isActive).flatMap((shift) => {
    const count = new Set(assignments.filter((row) => row.date === date && row.workShiftId === shift.id).map((row) => row.staffId)).size;
    return count < shift.minimumStaff ? [{ date, shift, missing: shift.minimumStaff - count }] : [];
  }));
}
