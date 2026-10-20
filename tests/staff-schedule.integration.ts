import assert from "node:assert/strict";
import { prisma } from "../lib/prisma";
import { getStaffSchedule } from "../lib/staff-schedule";

// Run only against a fresh temporary database, with --conditions=react-server.
async function main() {
  assert.ok(process.env.DATABASE_URL?.includes("schedule-test-"), "A dedicated schedule-test database is required.");
  const admin = await prisma.user.create({ data: { name: "Test Admin", username: "admin@test.invalid", passwordHash: "unused", role: "SUPER_ADMIN" } });
  const first = await prisma.user.create({ data: { name: "First Caregiver", username: "first@test.invalid", passwordHash: "unused", role: "STAFF" } });
  const second = await prisma.user.create({ data: { name: "Second Caregiver", username: "second@test.invalid", passwordHash: "unused", role: "STAFF" } });
  const client = await prisma.client.create({ data: { name: "Test Client", dob: new Date("2000-01-01"), clientId: "test-only", authorizationTier: "test" } });
  const filters = { from: "2026-10-19", to: "2026-10-20", staffId: "", shift: "" as const };
  const manual = await prisma.shiftAssignment.create({ data: { staffId: first.id, date: "2026-10-20", shift: "FIRST" } });
  const data = { clientId: client.id, staffId: admin.id, shiftStaffId: first.id, shift: "FIRST" as const, date: new Date("2026-10-20T00:00:00Z"), startTime: new Date("2026-10-20T08:00:00Z"), endTime: new Date("2026-10-20T09:00:00Z"), durationMinutes: 60, summativeNote: "", status: "SIGNED" as const };
  const entry = await prisma.cBHSEntry.create({ data });
  let rows = await getStaffSchedule(admin, filters);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].manualAssignmentId, manual.id);
  assert.equal(rows[0].logCount, 1);
  assert.equal((await getStaffSchedule(second, { ...filters, staffId: first.id })).length, 0, "Employee cannot widen their scope using a staff filter");
  await prisma.cBHSEntry.update({ where: { id: entry.id }, data: { shiftStaffId: second.id, shift: "SECOND" } });
  rows = await getStaffSchedule(admin, filters);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.staffId === first.id)?.logCount, 0);
  assert.equal(rows.find((row) => row.staffId === second.id)?.logCount, 1);
  assert.equal((await getStaffSchedule(second, { ...filters, staffId: first.id }))[0].staffId, second.id);
  assert.equal((await getStaffSchedule(admin, { ...filters, shift: "THIRD" })).length, 0);
  await prisma.cBHSEntry.delete({ where: { id: entry.id } });
  assert.equal((await getStaffSchedule(admin, filters)).length, 1, "Manual assignment survives deletion");
  await prisma.cBHSEntry.create({ data });
  assert.equal((await getStaffSchedule(admin, filters))[0].logCount, 1, "Re-added log appears immediately");
  await prisma.cBHSEntry.create({ data: { ...data, date: new Date("2026-10-21T00:00:00Z") } });
  assert.equal((await getStaffSchedule(admin, filters))[0].logCount, 1, "Exclusive upper date boundary works");
  console.log("PASS: live query, manual merge, caregiver/shift edit, delete/re-add, date boundaries, employee isolation");
}

main().finally(() => prisma.$disconnect());
