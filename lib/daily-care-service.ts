import "server-only";
import type { Prisma } from "@prisma/client";
import { dailyCareSchema } from "@/lib/daily-care";

export class DailyCareError extends Error {}

export async function saveDailyCareRecord(tx: Prisma.TransactionClient, actor: { id: string; role: string }, input: unknown) {
  const data = dailyCareSchema.parse(input);
  if (!await tx.client.findUnique({ where: { id: data.clientId } })) throw new DailyCareError("Resident not found.");
  if (data.id) {
    const previous = await tx.dailyCareNote.findUnique({ where: { id: data.id } });
    if (!previous || previous.deletedAt) throw new DailyCareError("Note not found.");
    if (previous.staffId !== actor.id && actor.role !== "SUPER_ADMIN") throw new DailyCareError("Only the author or administrator can edit this note.");
    if (previous.clientId !== data.clientId) throw new DailyCareError("The resident cannot be changed on an existing note.");
    // Compare-and-swap prevents overwriting another editor; deletion is also versioned.
    const updated = await tx.dailyCareNote.updateMany({ where: { id: data.id, version: data.version, deletedAt: null }, data: { date: data.date, note: data.note, version: { increment: 1 } } });
    if (!updated.count) throw new DailyCareError("This note changed. Reload it before editing.");
    await tx.auditLog.create({ data: { userId: actor.id, action: "UPDATE_DAILY_CARE_NOTE", details: `Daily care note ${data.id}, version ${data.version! + 1}.` } });
    return data.id;
  }
  const note = await tx.dailyCareNote.create({ data: { clientId: data.clientId, staffId: actor.id, date: data.date, note: data.note } });
  await tx.auditLog.create({ data: { userId: actor.id, action: "CREATE_DAILY_CARE_NOTE", details: `Daily care note ${note.id}.` } });
  return note.id;
}

export async function deleteDailyCareRecord(tx: Prisma.TransactionClient, actor: { id: string; role: string }, id: string, version: number) {
  const existing = await tx.dailyCareNote.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) throw new DailyCareError("Note not found.");
  if (existing.staffId !== actor.id && actor.role !== "SUPER_ADMIN") throw new DailyCareError("Only the author or administrator can delete this note.");
  // Soft deletion retains the clinical record without exposing note text in general audit details.
  const result = await tx.dailyCareNote.updateMany({ where: { id, version, deletedAt: null }, data: { deletedAt: new Date(), version: { increment: 1 } } });
  if (!result.count) throw new DailyCareError("This note changed. Reload it before deleting.");
  await tx.auditLog.create({ data: { userId: actor.id, action: "DELETE_DAILY_CARE_NOTE", details: `Daily care note ${id}.` } });
}
