"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveDailyCareRecord, deleteDailyCareRecord, DailyCareError } from "@/lib/daily-care-service";
import { z } from "zod";

async function activeActor() {
  const user = await requireUser();
  const actor = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, role: true, isActive: true } });
  if (!actor?.isActive) throw new Error("Sign in with an active account.");
  return actor;
}
export async function saveDailyCare(input: unknown) {
  const actor = await activeActor();
  try {
    await prisma.$transaction((tx) => saveDailyCareRecord(tx, actor, input));
    revalidatePath("/daily-notes");
    return { ok: true, message: "Daily note saved." };
  } catch (error) {
    return { ok: false, message: error instanceof z.ZodError ? "Check the resident, date, and note." : error instanceof DailyCareError ? error.message : "Unable to save this note." };
  }
}
export async function deleteDailyCare(input: unknown) {
  const actor = await activeActor();
  const data = z.object({ id: z.string().min(1), version: z.number().int().min(1) }).parse(input);
  try {
    await prisma.$transaction((tx) => deleteDailyCareRecord(tx, actor, data.id, data.version));
    revalidatePath("/daily-notes");
    return { ok: true, message: "Daily note deleted." };
  } catch { return { ok: false, message: "Unable to delete this note. It may have changed, or you may not have access." }; }
}
