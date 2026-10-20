import test from "node:test";
import assert from "node:assert/strict";
import { assignmentStaff, mergeSchedule, scheduleCsv, scheduleFilters, summarizeSchedule, type ScheduleLog } from "../lib/schedule-report";

const caregiver = { id: "caregiver", name: "Test Caregiver", role: "STAFF" };
const author = { id: "admin", name: "Test Admin", role: "SUPER_ADMIN" };
function log(overrides: Partial<ScheduleLog> = {}): ScheduleLog {
  return { date: new Date("2026-10-20T00:00:00Z"), shift: "FIRST", clientId: "client-a", staff: author, shiftStaff: caregiver, firstShiftStaff: null, secondShiftStaff: null, ...overrides };
}

test("one shift across multiple clients, with log and unique client counts", () => {
  const rows = mergeSchedule([], [log(), log({ clientId: "client-b" }), log()]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].staffId, caregiver.id);
  assert.equal(rows[0].logCount, 3);
  assert.equal(rows[0].clientCount, 2);
});

test("delete, re-add, and edit update derived shifts while preserving manual assignments", () => {
  const manual = [{ id: "assignment", staffId: caregiver.id, staff: caregiver, date: "2026-10-20", shift: "FIRST" as const }];
  assert.equal(mergeSchedule([], [log()]).length, 1);
  assert.equal(mergeSchedule([], []).length, 0);
  assert.equal(mergeSchedule([], [log()])[0].logCount, 1);
  assert.equal(mergeSchedule(manual, [log()]).length, 1);
  assert.equal(mergeSchedule(manual, [])[0].manualAssignmentId, "assignment");
  const changed = mergeSchedule(manual, [log({ shift: "SECOND" })]);
  assert.equal(changed.length, 2);
  assert.equal(changed.find((row) => row.shift === "FIRST")?.logCount, 0);
  assert.equal(changed.find((row) => row.shift === "SECOND")?.logCount, 1);
});

test("legacy attribution follows the entry shift, never the log author when selected staff exists", () => {
  const second = { id: "second", name: "Second Caregiver", role: "STAFF" };
  assert.equal(assignmentStaff(log({ shift: "SECOND", shiftStaff: null, firstShiftStaff: caregiver, secondShiftStaff: second })).id, second.id);
  assert.equal(assignmentStaff(log({ shiftStaff: null, firstShiftStaff: caregiver })).id, caregiver.id);
  assert.equal(mergeSchedule([], [log({ shiftStaff: null })]).length, 0);
  assert.equal(assignmentStaff(log({ shift: "THIRD", shiftStaff: null, staff: caregiver })).id, caregiver.id);
});

test("overnight shifts stay on their service date and day totals count distinct days", () => {
  const rows = mergeSchedule([], [log(), log({ shift: "THIRD" }), log({ date: new Date("2026-10-21T00:00:00Z") })]);
  assert.equal(rows.find((row) => row.shift === "THIRD")?.date, "2026-10-20");
  assert.deepEqual(summarizeSchedule(rows)[0], { staffId: caregiver.id, name: caregiver.name, days: 2, first: 2, second: 0, third: 1, shifts: 3, logs: 3 });
});

test("date filters reject invalid dates, reversed and excessive ranges", () => {
  assert.throws(() => scheduleFilters({ from: "2026-02-30" }));
  assert.throws(() => scheduleFilters({ from: "2026-10-21", to: "2026-10-20" }));
  assert.throws(() => scheduleFilters({ from: "2020-01-01", to: "2026-10-20" }));
  assert.equal(scheduleFilters({ shift: "constructor" }).shift, "");
  assert.equal(scheduleFilters({ from: "2026-10-20", to: "2026-10-20", shift: "SECOND" }).shift, "SECOND");
});

test("CSV neutralizes formulas and includes all rows with correct dates and counts", () => {
  const rows = mergeSchedule([], [log({ shiftStaff: { ...caregiver, name: '=HYPERLINK("bad")' } }), log({ date: new Date("2026-10-21T00:00:00Z") })]);
  const csv = scheduleCsv(rows);
  assert.equal(csv.split("\r\n").length, 3);
  assert.ok(csv.includes("10/20/2026"));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"Client logs","1","1"'));
});
