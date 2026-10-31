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

test("summary prioritizes incidents, refusals and actual changes over routine checklist text", () => {
  const content = blankMonthlyContent();
  for (const section of monthlySections) content.sections[section.key].status = "NO_CHANGE";
  content.adlAssistance = [...["Bathing and personal hygiene", "Dressing and grooming"] as const];
  content.sections.social.notes.activities = "Attended the usual social activities.";
  content.medicationAdministration = "NO";
  content.sections.medication.notes.concerns = "One medication was refused. This was entered in the medication log.";
  content.sections.mobility.status = "CHANGES";
  content.sections.mobility.notes.assistance = "Walking needed more support after a recent injury.";
  content.sections.mobility.notes.incidents = "No falls.";
  content.events = [{ date: "2026-10-08", description: "A fall occurred during a transfer.", action: "Staff followed the care plan and contacted the provider.", notification: "NOTIFIED", notifiedWho: "Provider", notifiedAt: "2026-10-08T09:30", followUp: "Monitor comfort as directed." }];
  const before = JSON.stringify(content);
  const summary = suggestedMonthlySummary(content);
  assert.ok(summary.startsWith("10/08: A fall occurred"));
  assert.ok(summary.includes("contacted the provider"));
  assert.ok(summary.includes("One medication was refused."));
  assert.ok(summary.includes("Walking needed more support"));
  assert.ok(!summary.includes("No change observed"));
  assert.ok(!summary.includes("Bathing and personal hygiene"));
  assert.ok(!summary.includes("usual social activities"));
  assert.ok(!summary.includes("No falls"));
  assert.ok(summary.split(/\s+/).length <= 120);
  assert.equal(JSON.stringify(content), before, "Drafting must not edit any observations or the saved summary");
});

test("summary avoids nine repeated unchanged statements and does not call unassessed areas stable", () => {
  const content = blankMonthlyContent();
  for (const section of monthlySections) content.sections[section.key].status = "NO_CHANGE";
  assert.equal(suggestedMonthlySummary(content), "No changes were noted in the assessed areas this month.");
  for (const section of monthlySections) content.sections[section.key].status = "NOT_ASSESSED";
  assert.equal(suggestedMonthlySummary(content), "The monthly observations were not assessed.");
});

test("summary keeps negations intact and deduplicates repeated concerns", () => {
  const content = blankMonthlyContent();
  content.sections.medication.notes.concerns = "Medication was not refused, but one dose was unavailable.";
  content.sections.changes.notes.concerns = content.sections.medication.notes.concerns;
  const summary = suggestedMonthlySummary(content);
  assert.equal(summary, content.sections.medication.notes.concerns);
});

test("summary retains key follow-up and does not stop at a provider title", () => {
  const content = blankMonthlyContent();
  content.sections.appointments.notes.orders = "Dr. Green ordered a medication change. Staff are coordinating with the pharmacy.";
  const summary = suggestedMonthlySummary(content);
  assert.ok(summary.includes("Dr. Green ordered a medication change."));
  assert.ok(summary.includes("Staff are coordinating with the pharmacy."));
});
