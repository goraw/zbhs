"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { verifyUserPassword } from "@/lib/security";
import { cbhsEntrySchema } from "@/lib/validation";

function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
}

export async function createSignedEntry(input: unknown) {
  const user = await requireUser();
  const data = cbhsEntrySchema.parse(input);

  const passwordOk = await verifyUserPassword(user.id, data.password);
  if (!passwordOk) throw new Error("Signature verification failed.");

  const startTime = combineDateAndTime(data.date, data.startTime);
  const endTime = combineDateAndTime(data.date, data.endTime);
  const durationMinutes = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000));
  if (durationMinutes <= 0) throw new Error("End time must be after start time.");

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.cBHSEntry.create({
      data: {
        clientId: data.clientId,
        staffId: user.id,
        date: data.date,
        startTime,
        endTime,
        durationMinutes,
        triggers: data.triggers,
        staffInterventions: data.staffInterventions,
        outcome: data.outcome,
        summativeNote: data.summativeNote,
        signatureText: data.signatureText,
        signatureTimestamp: new Date(),
        status: "SIGNED",
        behaviors: {
          create: data.behaviorIds.map((behaviorId) => ({ behaviorId }))
        }
      }
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CREATE_CBHS_ENTRY",
        details: `Created and signed locked CBHS entry ${created.id}.`
      }
    });

    return created;
  });

  redirect(`/api/reports/${entry.id}`);
}
