"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verifyUserPassword } from "@/lib/security";
import { weeklySummarySchema } from "@/lib/validation";
import { generatedSummaryNarrative } from "@/lib/weekly-summary-generator";

function normalizeWeekStart(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay();
  value.setDate(value.getDate() - day);
  return value;
}

function weekEndFromStart(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export async function generateWeeklySummary(clientId: string, weekStartValue: string) {
  await requireUser();
  if (!clientId || !weekStartValue) {
    throw new Error("Client and week are required to generate a summary.");
  }

  const weekStart = normalizeWeekStart(new Date(`${weekStartValue}T00:00:00`));
  const weekEnd = weekEndFromStart(weekStart);
  const [client, entries] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.cBHSEntry.findMany({
      where: {
        clientId,
        date: { gte: weekStart, lte: weekEnd }
      },
      select: { date: true, behaviorFrequencies: true },
      orderBy: { date: "asc" }
    })
  ]);

  if (!client) throw new Error("Client not found.");

  if (!entries.length) {
    return `No daily support logs were recorded for ${client.name} during ${shortDate(weekStart)} - ${shortDate(weekEnd)}.`;
  }

  return generatedSummaryNarrative(client.name, weekStart, entries);
}

export async function saveWeeklySummary(formData: FormData) {
  const user = await requireUser();
  const data = weeklySummarySchema.parse(Object.fromEntries(formData));
  const intent = String(formData.get("intent") ?? "draft");
  const simpleWeeklySummary = user.name === "Fikiraddis Worku";
  const shouldOpenPdf = intent === "pdf" || intent === "sign";
  const weekStart = normalizeWeekStart(data.weekStart);
  const weekEnd = weekEndFromStart(weekStart);
  const existing = await prisma.weeklySummary.findUnique({
    where: { clientId_weekStart: { clientId: data.clientId, weekStart } }
  });

  if (existing?.status === "SIGNED" && !simpleWeeklySummary) {
    throw new Error("Signed weekly summaries are locked.");
  }

  const isSigning = intent === "sign" || simpleWeeklySummary;
  if (isSigning) {
    if (!simpleWeeklySummary && (!data.password || !data.signatureText || !data.attestationName)) {
      throw new Error("Attestation name, signature, and password are required to sign.");
    }
    if (!simpleWeeklySummary) {
      const passwordOk = await verifyUserPassword(user.id, data.password ?? "");
      if (!passwordOk) throw new Error("Signature verification failed.");
    }
  }

  const summary = await prisma.weeklySummary.upsert({
    where: { clientId_weekStart: { clientId: data.clientId, weekStart } },
    update: {
      narrative: data.narrative,
      unusualEvents: "",
      interventionsUsed: "",
      effectiveness: "",
      attestationName: simpleWeeklySummary ? null : data.attestationName,
      signatureText: simpleWeeklySummary ? null : data.signatureText,
      signatureTimestamp: simpleWeeklySummary ? null : isSigning ? new Date() : null,
      status: isSigning ? "SIGNED" : "DRAFT"
    },
    create: {
      clientId: data.clientId,
      staffId: user.id,
      weekStart,
      weekEnd,
      narrative: data.narrative,
      unusualEvents: "",
      interventionsUsed: "",
      effectiveness: "",
      attestationName: simpleWeeklySummary ? null : data.attestationName,
      signatureText: simpleWeeklySummary ? null : data.signatureText,
      signatureTimestamp: simpleWeeklySummary ? null : isSigning ? new Date() : null,
      status: isSigning ? "SIGNED" : "DRAFT"
    }
  });

  await audit(simpleWeeklySummary ? "SAVE_WEEKLY_SUMMARY" : isSigning ? "SIGN_WEEKLY_SUMMARY" : "SAVE_WEEKLY_SUMMARY", {
    userId: user.id,
    details: `${simpleWeeklySummary ? "Saved" : isSigning ? "Signed" : "Saved"} weekly summary ${summary.id} for client ${data.clientId}.`
  });

  revalidatePath("/weekly");
  if (shouldOpenPdf && isSigning) redirect(`/api/reports/weekly/${summary.id}`);
}

export async function deleteWeeklySummary(formData: FormData) {
  const user = await requireUser();
  const summaryId = String(formData.get("summaryId") ?? "");
  if (!summaryId) throw new Error("Weekly summary is required.");

  const summary = await prisma.weeklySummary.findUnique({
    where: { id: summaryId },
    include: { client: true }
  });
  if (!summary) throw new Error("Weekly summary not found.");

  const canDeleteAnyWeeklySummary = user.role === "SUPER_ADMIN" || user.name === "Fikiraddis Worku";
  const canDeleteOwnDraft = summary.staffId === user.id && summary.status !== "SIGNED";
  if (!canDeleteAnyWeeklySummary && !canDeleteOwnDraft) {
    throw new Error("You do not have permission to delete this weekly summary.");
  }

  await prisma.weeklySummary.delete({ where: { id: summary.id } });

  await audit("DELETE_WEEKLY_SUMMARY", {
    userId: user.id,
    details: `Deleted weekly summary ${summary.id} for ${summary.client.name} covering ${shortDate(summary.weekStart)} - ${shortDate(summary.weekEnd)}.`
  });

  revalidatePath("/weekly");
}

export async function updateWeeklySummaryWetSignedPrinted(summaryId: string, isWetSignedPrinted: boolean) {
  const user = await requireUser();
  if (!summaryId) throw new Error("Weekly summary is required.");

  const summary = await prisma.weeklySummary.update({
    where: { id: summaryId },
    data: { isWetSignedPrinted },
    include: { client: true }
  });

  await audit("UPDATE_WEEKLY_SUMMARY_PRINT_STATUS", {
    userId: user.id,
    details: `${isWetSignedPrinted ? "Marked" : "Unmarked"} weekly summary ${summary.id} for ${summary.client.name} as printed and wet-signed.`
  });

  revalidatePath("/weekly");
  return { ok: true };
}
