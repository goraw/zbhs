import { test } from "node:test";
import assert from "node:assert/strict";
import { adjacentMonth, daysInMonth } from "../lib/daily-care-calendar";

test("month listing includes every date, including leap day", () => {
  assert.equal(daysInMonth("2026-02").length, 28);
  assert.equal(daysInMonth("2024-02")[28], "2024-02-29");
  assert.equal(daysInMonth("2026-10")[30], "2026-10-31");
  assert.equal(daysInMonth("2026-11").length, 30);
  assert.throws(() => daysInMonth("2026-13"));
});
test("month navigation handles years and valid range bounds", () => {
  assert.equal(adjacentMonth("2026-12", 1), "2027-01");
  assert.equal(adjacentMonth("2026-01", -1), "2025-12");
  assert.equal(adjacentMonth("1900-01", -1), null);
  assert.equal(adjacentMonth("2200-12", 1), null);
});
