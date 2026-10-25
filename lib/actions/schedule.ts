"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security";
import { isScheduleDate } from "@/lib/schedule-report";
import { assignStaffShift, revokeStaffShift, retireWorkShift } from "@/lib/hr-service";

export type HrResult = { ok: boolean; message: string };
const keySchema = z.object({ staffId: z.string().min(1), date: z.string().refine(isScheduleDate, "Choose a valid date."), workShiftId: z.string().min(1) });
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const shiftSchema = z.object({ name: z.string().trim().min(2).max(80), start: time, end: time, minimumStaff: z.coerce.number().int().min(1).max(20) }).refine((value) => value.start !== value.end, { message: "Start and end time must differ." });
const staffSchema = z.object({ name: z.string().trim().min(2).max(100), username: z.string().trim().toLowerCase().min(3).max(100), password: z.string().min(12).max(128) });

function refreshHr() { revalidatePath("/schedule"); revalidatePath("/reports"); revalidatePath("/admin/users"); }
function failure(error: unknown): HrResult {
  if (error instanceof z.ZodError) return { ok: false, message: error.issues[0]?.message ?? "Check the form fields." };
  if (error instanceof Prisma.PrismaClientKnownRequestError) return { ok: false, message: error.code === "P2002" ? "That staff username or shift name is already in use." : "The change could not be saved. Please try again." };
  return { ok: false, message: error instanceof Error ? error.message : "The change could not be saved." };
}

export async function changeShiftAssignment(input: unknown, intent: "assign" | "revoke"): Promise<HrResult> {
  const actor = await requireSuperAdmin();
  try {
    const key = keySchema.parse(input);
    if (intent !== "assign" && intent !== "revoke") throw new Error("Invalid assignment action.");
    await prisma.$transaction((tx) => intent === "assign" ? assignStaffShift(tx, actor.id, key) : revokeStaffShift(tx, actor.id, key));
    refreshHr();
    return { ok: true, message: intent === "assign" ? "Shift assigned." : "Assignment revoked. Coverage updated." };
  } catch (error) { return failure(error); }
}

export async function addHrStaff(_: HrResult, formData: FormData): Promise<HrResult> {
  const actor = await requireSuperAdmin();
  try {
    const data = staffSchema.parse(Object.fromEntries(formData));
    const passwordHash = await hashPassword(data.password);
    await prisma.$transaction(async (tx) => {
      // Role is fixed on the server; this form cannot create an administrator.
      const staff = await tx.user.create({ data: { name: data.name, username: data.username, passwordHash, role: "STAFF", forcePasswordReset: true } });
      await tx.auditLog.create({ data: { userId: actor.id, action: "CREATE_USER", details: "Added HR staff " + staff.id + "." } });
    });
    refreshHr();
    return { ok: true, message: "Staff added and available for assignment." };
  } catch (error) { return failure(error); }
}

export async function addWorkShift(_: HrResult, formData: FormData): Promise<HrResult> {
  const actor = await requireSuperAdmin();
  try {
    const data = shiftSchema.parse(Object.fromEntries(formData));
    const minute = (value: string) => { const [hour, part] = value.split(":").map(Number); return hour * 60 + part; };
    await prisma.$transaction(async (tx) => {
      const shift = await tx.workShift.create({ data: { name: data.name, startMinute: minute(data.start), endMinute: minute(data.end), minimumStaff: data.minimumStaff } });
      await tx.auditLog.create({ data: { userId: actor.id, action: "CREATE_WORK_SHIFT", details: "Created shift " + shift.id + ", " + data.start + "-" + data.end + ", minimum staff " + data.minimumStaff + "." } });
    });
    refreshHr();
    return { ok: true, message: "Shift added. Open slots are ready to assign." };
  } catch (error) { return failure(error); }
}

export async function removeWorkShift(id: string): Promise<HrResult> {
  const actor = await requireSuperAdmin();
  try {
    await prisma.$transaction((tx) => retireWorkShift(tx, actor.id, z.string().min(1).parse(id)));
    refreshHr();
    return { ok: true, message: "Shift removed. Full-day coverage is preserved." };
  } catch (error) { return failure(error); }
}
