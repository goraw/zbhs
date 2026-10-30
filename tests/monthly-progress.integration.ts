import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { blankMonthlyContent, monthlySections } from "../lib/monthly-progress";
import { saveMonthlyProgressRecord, reopenMonthlyProgressRecord } from "../lib/monthly-progress-service";

async function main() {
  assert.ok(process.env.DATABASE_URL?.includes("schedule-test-"), "Use a dedicated temporary test database.");
  const actor = await prisma.user.create({ data: { name: "Monthly Test Caregiver", username: "monthly-test", passwordHash: "unused", role: "STAFF" } });
  const client = await prisma.client.create({ data: { name: "Monthly Test Resident", dob: new Date("2000-01-01"), clientId: "monthly-test-only", authorizationTier: "test" } });
  const content = blankMonthlyContent();
  const draft = await prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: 0, intent: "draft", content }));
  assert.equal(draft.version, 1);
  await assert.rejects(prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: 0, intent: "draft", content })), /another session/);
  await assert.rejects(prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: 1, intent: "complete", content })), /select an observation/);
  for (const section of monthlySections) content.sections[section.key].status = "NO_CHANGE";
  content.medicationAdministration = "YES";
  content.significantChanges = "NO";
  content.summary = "Caregiver documented no changes in the assessed sections during this month.";
  const complete = await prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: 1, intent: "complete", content }));
  assert.equal(complete.status, "COMPLETED");
  await assert.rejects(prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: complete.version, intent: "draft", content })), /Start a correction/);
  const reopened = await prisma.$transaction((tx) => reopenMonthlyProgressRecord(tx, actor, { id: complete.id, version: complete.version, reason: "Correcting an omitted nutrition observation." }));
  assert.equal(reopened.status, "DRAFT");
  content.sections.nutrition.notes.appetite = "An additional meal observation was documented.";
  const saved = await prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: reopened.version, intent: "draft", content }));
  const old = await prisma.monthlyProgressRevision.findUniqueOrThrow({ where: { reportId_version: { reportId: complete.id, version: complete.version } } });
  assert.equal(old.status, "COMPLETED");
  assert.ok(!old.content.includes("additional meal observation"));
  assert.equal(saved.version, 4);
  assert.equal(await prisma.monthlyProgress.count(), 1);
  assert.equal(await prisma.monthlyProgressRevision.count(), 4);
  assert.equal(await prisma.cBHSEntry.count(), 0, "Monthly reporting does not require or generate clinical daily logs.");
  assert.equal(await prisma.auditLog.count(), 4);
  console.log("PASS: independent resident reports, drafts, completion validation, optimistic concurrency, explicit correction, preserved revisions, audit, no fabricated daily logs");
}
main().finally(() => prisma.$disconnect());
