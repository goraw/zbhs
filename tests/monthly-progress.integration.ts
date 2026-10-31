import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { blankMonthlyContent } from "../lib/monthly-progress";
import { saveMonthlyProgressRecord } from "../lib/monthly-progress-service";

async function main() {
  assert.ok(process.env.DATABASE_URL?.includes("schedule-test-"), "Use a dedicated temporary test database.");
  const actor = await prisma.user.create({ data: { name: "Monthly Test Caregiver", username: "monthly-test", passwordHash: "unused", role: "STAFF" } });
  const client = await prisma.client.create({ data: { name: "Monthly Test Resident", dob: new Date("2000-01-01"), clientId: "monthly-test-only", authorizationTier: "test" } });
  const content = blankMonthlyContent();
  const first = await prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: 0, intent: "save", content }));
  assert.equal(first.version, 1);
  assert.equal(first.status, "SAVED");
  content.sections.nutrition.notes.appetite = "A meal observation was documented.";
  const second = await prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: 1, intent: "save", content }));
  assert.equal(second.version, 2);
  await assert.rejects(prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: 1, intent: "save", content })), /another session/);
  // Previously completed reports must be directly editable after the workflow change.
  await prisma.monthlyProgress.update({ where: { id: second.id }, data: { status: "COMPLETED" } });
  const old = await prisma.monthlyProgressRevision.findUniqueOrThrow({ where: { reportId_version: { reportId: second.id, version: 2 } } });
  content.sections.nutrition.notes.appetite = "An additional meal observation was documented.";
  const saved = await prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, { clientId: client.id, month: "2026-10", version: 2, intent: "save", content }));
  assert.equal(saved.status, "SAVED");
  assert.equal(saved.version, 3);
  assert.deepEqual(await prisma.monthlyProgressRevision.findUniqueOrThrow({ where: { reportId_version: { reportId: second.id, version: 2 } } }), old);
  assert.ok(!old.content.includes("additional meal observation"));
  assert.equal(await prisma.monthlyProgress.count(), 1);
  assert.equal(await prisma.monthlyProgressRevision.count(), 3);
  assert.equal(await prisma.cBHSEntry.count(), 0);
  assert.equal(await prisma.auditLog.count(), 3);
  console.log("PASS: partial reports save, repeated direct editing, legacy-completed reports editable, stale-save protection, preserved versions, audit, no generated daily logs");
}
main().finally(() => prisma.$disconnect());
