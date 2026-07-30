"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { cbhsEntrySchema } from "@/lib/validation";

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
}

export async function createLoggedEntry(input: unknown) {
  const user = await requireUser();
  const data = cbhsEntrySchema.parse(input);

  const startTime = combineDateAndTime(data.date, "00:00");
  const endTime = combineDateAndTime(data.date, "00:01");
  const durationMinutes = 0;

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.cBHSEntry.create({
      data: {
        clientId: data.clientId,
        staffId: user.id,
        date: data.date,
        startTime,
        endTime,
        durationMinutes,
        servicePeriods: data.servicePeriods,
        behaviorFrequencies: JSON.stringify(data.behaviorFrequencies),
        triggers: "",
        staffInterventions: "",
        outcome: "",
        summativeNote: "",
        signatureText: user.name,
        signatureTimestamp: new Date(),
        status: "SIGNED"
      }
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_CBHS_ENTRY",
        details: `Created CBHS log entry ${created.id}.`
      }
    });

    return created;
  });

  redirect("/logs");
}

export async function updateLoggedEntry(entryId: string, input: unknown) {
  const user = await requireUser();
  const data = cbhsEntrySchema.parse(input);

  const startTime = combineDateAndTime(data.date, "00:00");
  const endTime = combineDateAndTime(data.date, "00:01");

  await prisma.$transaction(async (tx) => {
    await tx.cBHSEntry.update({
      where: { id: entryId },
      data: {
        clientId: data.clientId,
        date: data.date,
        startTime,
        endTime,
        servicePeriods: data.servicePeriods,
        behaviorFrequencies: JSON.stringify(data.behaviorFrequencies),
        signatureText: user.name,
        signatureTimestamp: new Date(),
        status: "SIGNED"
      }
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_CBHS_ENTRY",
        details: `Updated CBHS log entry ${entryId}.`
      }
    });
  });

  revalidatePath("/logs");
  redirect("/logs");
}

export async function deleteLoggedEntry(formData: FormData) {
  const user = await requireUser();
  const entryId = String(formData.get("entryId") ?? "");
  if (!entryId) throw new Error("Entry ID is required.");

  await prisma.$transaction(async (tx) => {
    await tx.cBHSEntry.delete({ where: { id: entryId } });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_CBHS_ENTRY",
        details: `Deleted CBHS log entry ${entryId}.`
      }
    });
  });

  revalidatePath("/logs");
}
