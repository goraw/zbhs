import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { saveDailyCareRecord, deleteDailyCareRecord } from "../lib/daily-care-service";

async function main() {
  assert.ok(process.env.DATABASE_URL?.includes("schedule-test-"));
  const author = await prisma.user.create({ data: { name: "Synthetic Author", username: "daily-author", passwordHash: "unused", role: "STAFF" } });
  const other = await prisma.user.create({ data: { name: "Synthetic Other", username: "daily-other", passwordHash: "unused", role: "STAFF" } });
  const admin = await prisma.user.create({ data: { name: "Synthetic Admin", username: "daily-admin", passwordHash: "unused", role: "SUPER_ADMIN" } });
  const resident = await prisma.client.create({ data: { name: "Synthetic Resident", clientId: "1000", authorizationTier: "Test" } });
  const input = { clientId: resident.id, date: "2026-01-01", note: "Synthetic observation" };
  const id = await prisma.$transaction((tx) => saveDailyCareRecord(tx, author, input));
  await assert.rejects(prisma.$transaction((tx) => saveDailyCareRecord(tx, other, { ...input, id, version: 1 })), /author or administrator/);
  await prisma.$transaction((tx) => saveDailyCareRecord(tx, author, { ...input, id, version: 1, note: "Updated synthetic observation" }));
  await assert.rejects(prisma.$transaction((tx) => saveDailyCareRecord(tx, author, { ...input, id, version: 1 })), /changed/);
  await assert.rejects(prisma.$transaction((tx) => deleteDailyCareRecord(tx, other, id, 2)), /author or administrator/);
  await prisma.$transaction((tx) => deleteDailyCareRecord(tx, admin, id, 2));
  assert.ok((await prisma.dailyCareNote.findUniqueOrThrow({ where: { id } })).deletedAt);
  assert.equal(await prisma.dailyCareNote.count({ where: { deletedAt: null } }), 0);
  assert.equal(await prisma.auditLog.count(), 3);
  assert.equal(await prisma.cBHSEntry.count(), 0);
  assert.equal(await prisma.monthlyProgress.count(), 0);
  console.log("PASS: separate records, author/admin permissions, stale edit protection, soft deletion and atomic audit");
}
main().finally(() => prisma.$disconnect());
