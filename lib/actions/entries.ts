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
        signatureText: data.signatureText,
        signatureTimestamp: new Date(),
        status: "SIGNED"
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

  redirect("/logs");
}
