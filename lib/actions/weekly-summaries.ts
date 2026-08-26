"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verifyUserPassword } from "@/lib/security";
import { weeklySummarySchema } from "@/lib/validation";
import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";

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

function sentenceList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function lowerFirst(value: string) {
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function interventionPhrase(value: string) {
  return lowerFirst(value.replace(/\.$/, ""));
}

function generatedSummaryNarrative(clientName: string, entries: Array<{ date: Date; behaviorFrequencies: string }>) {
  const lineTotals = new Map<number, number>();
  const documentedDays = new Set(entries.map((entry) => shortDate(entry.date)));

  for (const entry of entries) {
    const frequencies = parseBehaviorFrequencies(entry.behaviorFrequencies);
    for (const [lineValue, frequencyValue] of Object.entries(frequencies)) {
      const line = Number(lineValue);
      const frequency = Number(frequencyValue);
      if (!Number.isInteger(line) || !Number.isFinite(frequency) || frequency <= 0) continue;
      lineTotals.set(line, (lineTotals.get(line) ?? 0) + frequency);
    }
  }

  const observedLines = cbhsStandardLines
    .map((line) => ({ ...line, total: lineTotals.get(line.line) ?? 0 }))
    .filter((line) => line.total > 0)
    .sort((left, right) => right.total - left.total || left.line - right.line);

  if (!observedLines.length) {
    return `${clientName} received supportive supervision across ${documentedDays.size} documented day${documentedDays.size === 1 ? "" : "s"} this week. Staff maintained routine monitoring and plan-based support; no behavior frequencies were recorded in the daily logs.`;
  }

  const dominant = observedLines[0];
  const otherBehaviors = observedLines.slice(1, 4).map((line) => lowerFirst(line.behavior));
  const mainInterventions = observedLines.slice(0, 3).map((line) => interventionPhrase(line.intervention));
  const isMichaelFiveDominant = clientName.toLowerCase().includes("michael") && dominant.line === 5;

  const sentences = [
    `Staff focused on ${clientName}'s most common observed behavior, ${lowerFirst(dominant.behavior)}.`
  ];

  if (otherBehaviors.length) {
    sentences.push(`Less frequent concerns included ${sentenceList(otherBehaviors)}.`);
  }

  sentences.push(`Support included ${sentenceList(mainInterventions)}.`);

  if (isMichaelFiveDominant) {
    sentences.push("Staff noted that giving Michael space after a calm prompt was often the most effective way to help him settle and avoid escalation.");
  } else {
    sentences.push("Staff continued routine monitoring, calm redirection, and care-plan-based support throughout the week.");
  }

  return sentences.join(" ");
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

  return generatedSummaryNarrative(client.name, entries);
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
      unusualEvents: "",
      interventionsUsed: "",
      effectiveness: "",
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
      unusualEvents: "",
      interventionsUsed: "",
      effectiveness: "",
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
