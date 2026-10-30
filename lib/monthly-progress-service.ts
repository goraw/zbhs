import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { completionIssues, monthlySaveSchema } from "@/lib/monthly-progress";

type Actor = { id: string; name: string };

export async function saveMonthlyProgressRecord(tx: Prisma.TransactionClient, actor: Actor, input: unknown) {
  const data = monthlySaveSchema.parse(input);
  if (data.intent === "complete") {
    const issues = completionIssues(data.content, data.month);
    if (issues.length) throw new Error(issues.slice(0, 3).join(" "));
  }
  if (!await tx.client.findUnique({ where: { id: data.clientId }, select: { id: true } })) throw new Error("Resident not found.");
  const existing = await tx.monthlyProgress.findUnique({ where: { clientId_month: { clientId: data.clientId, month: data.month } } });
  if (existing?.status === "COMPLETED") throw new Error("This report is completed. Start a correction before editing it.");
  if ((existing?.version ?? 0) !== data.version) throw new Error("This report changed in another session. Reload it before saving to avoid overwriting another caregiver's work.");
  const values = { staffId: actor.id, authorName: actor.name, content: JSON.stringify(data.content), status: data.intent === "complete" ? "COMPLETED" as const : "DRAFT" as const, completedAt: data.intent === "complete" ? new Date() : null };
  let id: string;
  const version = data.version + 1;
  if (existing) {
    // Compare-and-swap prevents a second editor silently overwriting a saved revision.
    const result = await tx.monthlyProgress.updateMany({ where: { id: existing.id, version: data.version, status: "DRAFT" }, data: { ...values, version } });
    if (result.count !== 1) throw new Error("This report changed in another session. Reload it before saving.");
    id = existing.id;
  } else {
    id = (await tx.monthlyProgress.create({ data: { ...values, clientId: data.clientId, month: data.month, version } })).id;
  }
  // Clinical snapshots stay in protected resident records, not general audit details.
  await tx.monthlyProgressRevision.create({ data: { reportId: id, version, ...values, reason: data.intent === "complete" ? "Completed report" : "Saved draft" } });
  await tx.auditLog.create({ data: { userId: actor.id, action: data.intent === "complete" ? "COMPLETE_MONTHLY_PROGRESS" : "SAVE_MONTHLY_PROGRESS", details: `Monthly progress ${id}, version ${version}, month ${data.month}.` } });
  return { id, version, status: values.status, authorName: actor.name, completedAt: values.completedAt?.toISOString() ?? null };
}

const correctionSchema = z.object({ id: z.string().min(1), version: z.number().int().positive(), reason: z.string().trim().min(5).max(1000) }).strict();
export async function reopenMonthlyProgressRecord(tx: Prisma.TransactionClient, actor: Actor, input: unknown) {
  const data = correctionSchema.parse(input);
  const report = await tx.monthlyProgress.findUnique({ where: { id: data.id } });
  if (!report || report.status !== "COMPLETED" || report.version !== data.version) throw new Error("The report changed or is no longer completed. Reload it before making a correction.");
  const version = report.version + 1;
  const result = await tx.monthlyProgress.updateMany({ where: { id: report.id, version: report.version, status: "COMPLETED" }, data: { version, status: "DRAFT", staffId: actor.id, authorName: actor.name, completedAt: null } });
  if (result.count !== 1) throw new Error("The report changed. Reload it before making a correction.");
  await tx.monthlyProgressRevision.create({ data: { reportId: report.id, version, staffId: actor.id, authorName: actor.name, content: report.content, status: "DRAFT", reason: data.reason } });
  await tx.auditLog.create({ data: { userId: actor.id, action: "REOPEN_MONTHLY_PROGRESS", details: `Reopened monthly progress ${report.id} for correction, version ${version}.` } });
  return { id: report.id, version, status: "DRAFT" as const, authorName: actor.name, completedAt: null };
}
