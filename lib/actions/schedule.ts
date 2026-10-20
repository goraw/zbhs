"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const assignmentSchema = z.object({
  staffId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Choose a valid date."),
  shift: z.enum(["FIRST", "SECOND", "THIRD"])
});

export async function assignShift(_: { message: string; ok: boolean }, formData: FormData) {
  // Every mutation checks the administrator role on the server.
  const actor = await requireSuperAdmin();
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Choose a staff member, valid date, and shift." };
  const data = parsed.data;
  return prisma.$transaction(async (tx) => {
    const staff = await tx.user.findFirst({ where: { id: data.staffId, role: "STAFF", isActive: true } });
    if (!staff) return { ok: false, message: "Choose an active staff member." };
    const existing = await tx.shiftAssignment.findUnique({ where: { staffId_date_shift: data } });
    if (existing) return { ok: false, message: "This staff member already has that shift." };
    const assignment = await tx.shiftAssignment.create({ data });
    // Audit and assignment commit together, so no unaudited schedule change persists.
    await tx.auditLog.create({ data: { userId: actor.id, action: "ASSIGN_SHIFT", details: `Assigned ${assignment.id}: staff ${staff.id}, ${data.date}, ${data.shift}.` } });
    revalidatePath("/schedule");
    revalidatePath("/reports");
    return { ok: true, message: "Shift assigned." };
  });
}

export async function removeShift(formData: FormData) {
  const actor = await requireSuperAdmin();
  const id = z.string().min(1).parse(formData.get("assignmentId"));
  await prisma.$transaction(async (tx) => {
    const assignment = await tx.shiftAssignment.delete({ where: { id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: "REMOVE_SHIFT", details: `Removed ${assignment.id}: staff ${assignment.staffId}, ${assignment.date}, ${assignment.shift}.` } });
  });
  revalidatePath("/schedule");
  revalidatePath("/reports");
}
