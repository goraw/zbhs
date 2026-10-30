import test from "node:test";
import assert from "node:assert/strict";
import { blankMonthlyContent, completionIssues, monthlyContentSchema, monthlySections, suggestedMonthlySummary, validMonth } from "../lib/monthly-progress";

test("new reports contain no default clinical assertions", () => {
  const content = blankMonthlyContent();
  assert.equal(monthlySections.length, 9);
  assert.ok(monthlySections.every((section) => content.sections[section.key].status === ""));
  assert.equal(content.medicationAdministration, "");
  assert.equal(content.significantChanges, "");
  assert.equal(suggestedMonthlySummary(content), "");
  assert.ok(completionIssues(content, "2026-10").length >= 12);
});

test("explicit unchanged or not-assessed sections can be completed without inventing notes", () => {
  const content = blankMonthlyContent();
  for (const section of monthlySections) content.sections[section.key].status = "NOT_ASSESSED";
  content.medicationAdministration = "NOT_ASSESSED";
  content.significantChanges = "NOT_ASSESSED";
  content.summary = "Observations were not assessed during this reporting period.";
  assert.deepEqual(completionIssues(content, "2026-10"), []);
  assert.equal(monthlyContentSchema.safeParse(content).success, true);
});

test("refusals and changes require actual caregiver documentation", () => {
  const content = blankMonthlyContent();
  content.sections.nutrition.status = "CHANGES";
  content.medicationAdministration = "NO";
  assert.ok(completionIssues(content, "2026-10").some((issue) => issue.includes("Nutrition")));
  assert.ok(completionIssues(content, "2026-10").some((issue) => issue.includes("refusals")));
  content.sections.nutrition.notes.appetite = "Appetite was reduced during two evening meals.";
  content.sections.medication.notes.concerns = "One dose refused; medication record and provider notification documented separately.";
  assert.ok(!completionIssues(content, "2026-10").some((issue) => issue.includes("Nutrition")));
  const summary = suggestedMonthlySummary(content);
  assert.ok(summary.includes(content.sections.nutrition.notes.appetite));
  assert.ok(!summary.includes("medication independent"));
  assert.ok(!summary.includes("No change observed"));
});

test("significant changes enforce month, action and notification details", () => {
  const content = blankMonthlyContent();
  content.significantChanges = "YES";
  content.events.push({ date: "2026-11-01", description: "Test change", action: "", notification: "NOTIFIED", notifiedWho: "", notifiedAt: "", followUp: "" });
  const issues = completionIssues(content, "2026-10");
  assert.ok(issues.some((issue) => issue.includes("within the reporting month")));
  assert.ok(issues.some((issue) => issue.includes("action taken")));
  assert.ok(issues.some((issue) => issue.includes("who was notified")));
  content.events[0].date = "2026-02-30";
  assert.equal(monthlyContentSchema.safeParse(content).success, false);
  assert.equal(validMonth("2026-13"), false);
  assert.equal(validMonth("2026-10"), true);
});
