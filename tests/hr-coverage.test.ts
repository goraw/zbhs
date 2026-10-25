import test from "node:test";
import assert from "node:assert/strict";
import { coverageGaps, defaultWorkShifts, openShiftSlots, shiftsOverlap, weekDays } from "../lib/hr";
import { mergeSchedule } from "../lib/schedule-report";

test("default shift definitions cover all 24 hours and detect the original afternoon gap", () => {
  assert.deepEqual(coverageGaps(defaultWorkShifts), []);
  assert.deepEqual(coverageGaps(defaultWorkShifts.filter((shift) => shift.id !== "hr-cover")), [{ start: 840, end: 960 }]);
  assert.deepEqual(coverageGaps([]), [{ start: 0, end: 1440 }]);
});

test("minimum staffing counts unique employees and detects open shifts", () => {
  const shifts = [{ ...defaultWorkShifts[0], minimumStaff: 2 }];
  const rows = [{ date: "2026-10-24", workShiftId: "hr-first", staffId: "a" }];
  assert.equal(openShiftSlots(["2026-10-24"], shifts, [...rows, ...rows])[0].missing, 1);
  assert.equal(openShiftSlots(["2026-10-24"], shifts, [...rows, { ...rows[0], staffId: "b" }]).length, 0);
});

test("overlap protection spans midnight but permits back-to-back shifts", () => {
  const night = defaultWorkShifts[3];
  assert.equal(shiftsOverlap("2026-10-23", night, "2026-10-24", { startMinute: 300, endMinute: 420 }), true);
  assert.equal(shiftsOverlap("2026-10-23", night, "2026-10-24", defaultWorkShifts[0]), false);
  assert.equal(shiftsOverlap("2026-10-24", defaultWorkShifts[0], "2026-10-24", defaultWorkShifts[1]), false);
});

test("revoking synchronized shifts is durable and does not alter clinical records", () => {
  const staff = { id: "staff", name: "Test Staff", role: "STAFF" };
  const log = { date: new Date("2026-10-24T00:00:00Z"), clientId: "client", shift: "FIRST" as const, staff, shiftStaff: staff, firstShiftStaff: null, secondShiftStaff: null };
  const revoked = [{ staffId: staff.id, date: "2026-10-24", workShiftId: "hr-first" }];
  assert.equal(mergeSchedule([], [log], defaultWorkShifts, revoked).length, 0);
  assert.equal(log.shift, "FIRST");
  assert.equal(mergeSchedule([], [log], defaultWorkShifts, []).length, 1);
});

test("week navigation stays Monday through Sunday over year boundaries", () => {
  const days = weekDays("2027-01-01");
  assert.equal(days[0], "2026-12-28");
  assert.equal(days[6], "2027-01-03");
});
