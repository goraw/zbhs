"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verifyUserPassword } from "@/lib/security";
import { weeklySummarySchema } from "@/lib/validation";

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

export async function saveWeeklySummary(formData: FormData) {
  const user = await requireUser();
  const data = weeklySummarySchema.parse(Object.fromEntries(formData));
  const intent = String(formData.get("intent") ?? "draft");
  const weekStart = normalizeWeekStart(data.weekStart);
  const weekEnd = weekEndFromStart(weekStart);
  const existing = await prisma.weeklySummary.findUnique({
    where: { clientId_weekStart: { clientId: data.clientId, weekStart } }
  });

  if (existing?.status === "SIGNED") {
    throw new Error("Signed weekly summaries are locked.");
  }

  const isSigning = intent === "sign";
  if (isSigning) {
    if (!data.password || !data.signatureText || !data.attestationName) {
      throw new Error("Attestation name, signature, and password are required to sign.");
    }
    const passwordOk = await verifyUserPassword(user.id, data.password);
    if (!passwordOk) throw new Error("Signature verification failed.");
  }

  const summary = await prisma.weeklySummary.upsert({
    where: { clientId_weekStart: { clientId: data.clientId, weekStart } },
    update: {
      narrative: data.narrative,
      unusualEvents: data.unusualEvents,
      interventionsUsed: data.interventionsUsed,
      effectiveness: data.effectiveness,
      attestationName: data.attestationName,
      signatureText: isSigning ? data.signatureText : data.signatureText,
      signatureTimestamp: isSigning ? new Date() : null,
      status: isSigning ? "SIGNED" : "DRAFT"
    },
    create: {
      clientId: data.clientId,
      staffId: user.id,
      weekStart,
      weekEnd,
      narrative: data.narrative,
      unusualEvents: data.unusualEvents,
      interventionsUsed: data.interventionsUsed,
      effectiveness: data.effectiveness,
      attestationName: data.attestationName,
      signatureText: isSigning ? data.signatureText : data.signatureText,
      signatureTimestamp: isSigning ? new Date() : null,
      status: isSigning ? "SIGNED" : "DRAFT"
    }
  });

  await audit(isSigning ? "SIGN_WEEKLY_SUMMARY" : "SAVE_WEEKLY_SUMMARY", {
    userId: user.id,
    details: `${isSigning ? "Signed" : "Saved"} weekly summary ${summary.id} for client ${data.clientId}.`
  });

  revalidatePath("/weekly");
  if (isSigning) redirect(`/api/reports/weekly/${summary.id}`);
}
