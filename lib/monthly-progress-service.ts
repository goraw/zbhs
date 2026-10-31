import "server-only";
import type { Prisma } from "@prisma/client";
import { monthlySaveSchema } from "@/lib/monthly-progress";

type Actor = { id: string; name: string };

export async function saveMonthlyProgressRecord(tx: Prisma.TransactionClient, actor: Actor, input: unknown) {
  const data = monthlySaveSchema.parse(input);
  if (!await tx.client.findUnique({ where: { id: data.clientId }, select: { id: true } })) throw new Error("Resident not found.");
  const existing = await tx.monthlyProgress.findUnique({ where: { clientId_month: { clientId: data.clientId, month: data.month } } });
  if ((existing?.version ?? 0) !== data.version) throw new Error("This report changed in another session. Reload it before saving to avoid overwriting another caregiver's work.");
  const values = { staffId: actor.id, authorName: actor.name, content: JSON.stringify(data.content), status: "SAVED" as const, completedAt: null };
  let id: string;
  const version = data.version + 1;
  if (existing) {
    // Compare-and-swap prevents a second editor silently overwriting a saved revision.
    const result = await tx.monthlyProgress.updateMany({ where: { id: existing.id, version: data.version }, data: { ...values, version } });
    if (result.count !== 1) throw new Error("This report changed in another session. Reload it before saving.");
    id = existing.id;
  } else {
    id = (await tx.monthlyProgress.create({ data: { ...values, clientId: data.clientId, month: data.month, version } })).id;
  }
  // Clinical snapshots stay in protected resident records, not general audit details.
  await tx.monthlyProgressRevision.create({ data: { reportId: id, version, ...values, reason: "Saved report" } });
  await tx.auditLog.create({ data: { userId: actor.id, action: "SAVE_MONTHLY_PROGRESS", details: `Monthly progress ${id}, version ${version}, month ${data.month}.` } });
  return { id, version, status: values.status, authorName: actor.name, completedAt: null };
}
