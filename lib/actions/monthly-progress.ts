"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveMonthlyProgressRecord } from "@/lib/monthly-progress-service";

async function activeActor() {
  const session = await requireUser();
  const user = await prisma.user.findFirst({ where: { id: session.id, isActive: true }, select: { id: true, name: true } });
  if (!user) throw new Error("Your account is no longer active. Please sign in again.");
  return user;
}
function message(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Check the form fields.";
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code === "P2002" ? "A report for this resident and month was just saved. Reload it to continue." : "Unable to save the report. Please reload and try again.";
  return error instanceof Error ? error.message : "Unable to save the report.";
}
export async function saveMonthlyProgress(input: unknown) {
  const actor = await activeActor();
  try {
    const report = await prisma.$transaction((tx) => saveMonthlyProgressRecord(tx, actor, input));
    revalidatePath("/monthly", "layout");
    return { ok: true as const, report };
  } catch (error) { return { ok: false as const, message: message(error) }; }
}
