import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyCareSchema } from "../lib/daily-care";
import { blankMonthlyContent } from "../lib/monthly-progress";
import { noChangeMonthlyContent } from "../lib/monthly-no-change";

test("Daily notes require valid dates and nonblank notes", () => {
  assert.equal(dailyCareSchema.safeParse({ clientId: "r", date: "2026-02-30", note: "Test" }).success, false);
  assert.equal(dailyCareSchema.safeParse({ clientId: "r", date: "2200-01-01", note: "Test" }).success, false);
  assert.equal(dailyCareSchema.safeParse({ clientId: "r", date: "2026-01-01", note: " " }).success, false);
  assert.equal(dailyCareSchema.safeParse({ clientId: "r", date: "2026-01-01", note: "Synthetic note" }).success, true);
});
test("No-change wording is opt-in, preserves input and does not assert medications", () => {
  const blank = blankMonthlyContent();
  const next = noChangeMonthlyContent(blank);
  assert.equal(blank.summary, "");
  assert.equal(next.medicationAdministration, "");
  assert.equal(next.sections.health.status, "NO_CHANGE");
  assert.equal(next.significantChanges, "NO");
  blank.sections.health.notes.condition = "Documented observation";
  assert.throws(() => noChangeMonthlyContent(blank));
});
