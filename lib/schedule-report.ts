import type { ShiftPeriod } from "@prisma/client";

export const shiftLabels: Record<ShiftPeriod, string> = {
  FIRST: "First (6AM-2PM)",
  SECOND: "Second (4PM-10PM)",
  THIRD: "Third (10PM-6AM next day)"
};
export type ScheduleFilters = { from: string; to: string; staffId: string; shift: ShiftPeriod | "" };
export type ScheduleRow = {
  key: string; staffId: string; staffName: string; date: string; shift: ShiftPeriod;
  manualAssignmentId: string | null; logCount: number; clientCount: number;
};
type Staff = { id: string; name: string; role: string };
export type ScheduleLog = {
  date: Date; shift: ShiftPeriod; clientId: string;
  staff: Staff; shiftStaff: Staff | null; firstShiftStaff: Staff | null; secondShiftStaff: Staff | null;
};
type ManualAssignment = { id: string; staffId: string; date: string; shift: ShiftPeriod; staff: { name: string } };

export function isScheduleDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function scheduleFilters(params: Record<string, string | string[] | undefined>, now = new Date()): ScheduleFilters {
  for (const name of ["from", "to"]) {
    if (params[name] && (typeof params[name] !== "string" || !isScheduleDate(params[name]))) throw new Error("Choose valid start and end dates.");
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 89);
  const from = typeof params.from === "string" && isScheduleDate(params.from) ? params.from : start.toISOString().slice(0, 10);
  const to = typeof params.to === "string" && isScheduleDate(params.to) ? params.to : today;
  if (to < from) throw new Error("The end date must be on or after the start date.");
  if (Date.parse(to) - Date.parse(from) > 1095 * 86400000) throw new Error("Choose a date range of three years or less.");
  const shift = typeof params.shift === "string" && ["FIRST", "SECOND", "THIRD"].includes(params.shift) ? params.shift as ShiftPeriod : "";
  return { from, to, staffId: typeof params.staffId === "string" ? params.staffId : "", shift };
}

export function assignmentStaff(entry: ScheduleLog): Staff {
  // Prefer the selected caregiver; the log author may be a different employee.
  return entry.shiftStaff ?? (entry.shift === "FIRST" ? entry.firstShiftStaff : entry.shift === "SECOND" ? entry.secondShiftStaff : null) ?? entry.staff;
}

export function mergeSchedule(manual: ManualAssignment[], logs: ScheduleLog[]): ScheduleRow[] {
  const rows = new Map<string, ScheduleRow & { clients: Set<string> }>();
  const keyFor = (staffId: string, date: string, shift: ShiftPeriod) => `${staffId}:${date}:${shift}`;
  for (const item of manual) {
    const key = keyFor(item.staffId, item.date, item.shift);
    rows.set(key, { key, staffId: item.staffId, staffName: item.staff.name, date: item.date, shift: item.shift, manualAssignmentId: item.id, logCount: 0, clientCount: 0, clients: new Set() });
  }
  for (const entry of logs) {
    const staff = assignmentStaff(entry);
    if (staff.role !== "STAFF") continue;
    const date = entry.date.toISOString().slice(0, 10);
    const key = keyFor(staff.id, date, entry.shift);
    const row = rows.get(key) ?? { key, staffId: staff.id, staffName: staff.name, date, shift: entry.shift, manualAssignmentId: null, logCount: 0, clientCount: 0, clients: new Set<string>() };
    row.logCount += 1;
    row.clients.add(entry.clientId);
    row.clientCount = row.clients.size;
    rows.set(key, row);
  }
  const order = { FIRST: 0, SECOND: 1, THIRD: 2 };
  return Array.from(rows.values()).map(({ clients: _clients, ...row }) => row)
    .sort((a, b) => b.date.localeCompare(a.date) || order[a.shift] - order[b.shift] || a.staffName.localeCompare(b.staffName) || a.staffId.localeCompare(b.staffId));
}

export function scheduleSource(row: ScheduleRow) {
  return row.manualAssignmentId ? (row.logCount ? "Assigned + logged" : "Assigned") : "Client logs";
}

export function summarizeSchedule(rows: ScheduleRow[]) {
  const people = new Map<string, { staffId: string; name: string; days: Set<string>; first: number; second: number; third: number; shifts: number; logs: number }>();
  for (const row of rows) {
    const person = people.get(row.staffId) ?? { staffId: row.staffId, name: row.staffName, days: new Set<string>(), first: 0, second: 0, third: 0, shifts: 0, logs: 0 };
    person.days.add(row.date);
    person.shifts++;
    person.logs += row.logCount;
    if (row.shift === "FIRST") person.first++;
    if (row.shift === "SECOND") person.second++;
    if (row.shift === "THIRD") person.third++;
    people.set(row.staffId, person);
  }
  return Array.from(people.values()).map(({ days, ...person }) => ({ ...person, days: days.size })).sort((a, b) => a.name.localeCompare(b.name));
}

export function americanScheduleDate(value: string) { return `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`; }

export function scheduleCsv(rows: ScheduleRow[]) {
  const cell = (value: string | number) => {
    const text = String(value);
    // Neutralize spreadsheet formulas, including values with leading whitespace.
    const safe = /^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const data = [["Date", "Staff", "Shift", "Source", "Client logs", "Clients"], ...rows.map((row) => [americanScheduleDate(row.date), row.staffName, shiftLabels[row.shift], scheduleSource(row), row.logCount, row.clientCount])];
  return "\uFEFF" + data.map((row) => row.map(cell).join(",")).join("\r\n");
}
