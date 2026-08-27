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

function dateRangeForDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function staffInitials(name: string) {
  // Daily CBHS logs use staff initials as the signature mark; weekly summaries
  // still require the full typed attestation signature in the weekly action.
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 3);
}

export async function getLoggedEntryForDate(clientId: string, dateValue: string, shift: "FIRST" | "SECOND" | "THIRD") {
  await requireUser();
  if (!clientId || !dateValue || !shift) return null;

  const date = new Date(`${dateValue}T00:00:00`);
  const { start, end } = dateRangeForDay(date);
  const entry = await prisma.cBHSEntry.findFirst({
    where: {
      clientId,
      shift,
      date: { gte: start, lt: end }
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      clientId: true,
      date: true,
      shift: true,
      servicePeriods: true,
      behaviorFrequencies: true,
      shiftStaffId: true,
      firstShiftStaffId: true,
      secondShiftStaffId: true
    }
  });

  if (!entry) return null;

  return {
    ...entry,
    date: entry.date.toISOString()
  };
}

export async function createLoggedEntry(input: unknown) {
  await saveLoggedEntryCreate(input);
  redirect("/logs");
}

export async function createLoggedEntryInline(input: unknown) {
  await saveLoggedEntryCreate(input);
  return { ok: true };
}

async function saveLoggedEntryCreate(input: unknown) {
  const user = await requireUser();
  const data = cbhsEntrySchema.parse(input);

  const startTime = combineDateAndTime(data.date, "00:00");
  const endTime = combineDateAndTime(data.date, "00:01");
  const durationMinutes = 0;
  const firstShiftStaffId = data.shift === "FIRST" ? data.shiftStaffId : null;
  const secondShiftStaffId = data.shift === "SECOND" ? data.shiftStaffId : null;

  await prisma.$transaction(async (tx) => {
    const shiftStaff = await tx.user.findUnique({
      where: { id: data.shiftStaffId },
      select: { name: true, isActive: true, role: true }
    });
    if (!shiftStaff || !shiftStaff.isActive || shiftStaff.role !== "STAFF") {
      throw new Error("Selected staff member is not active.");
    }
    const signatureText = staffInitials(shiftStaff.name);
    const created = await tx.cBHSEntry.create({
      data: {
        clientId: data.clientId,
        staffId: user.id,
        shift: data.shift,
        shiftStaffId: data.shiftStaffId,
        firstShiftStaffId,
        secondShiftStaffId,
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
        signatureText,
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

  });

  revalidatePath("/logs");
}

export async function updateLoggedEntry(entryId: string, input: unknown) {
  await saveLoggedEntryUpdate(entryId, input);
  redirect("/logs");
}

export async function updateLoggedEntryInline(entryId: string, input: unknown) {
  await saveLoggedEntryUpdate(entryId, input);
  return { ok: true };
}

async function saveLoggedEntryUpdate(entryId: string, input: unknown) {
  const user = await requireUser();
  const data = cbhsEntrySchema.parse(input);

  const startTime = combineDateAndTime(data.date, "00:00");
  const endTime = combineDateAndTime(data.date, "00:01");
  const firstShiftStaffId = data.shift === "FIRST" ? data.shiftStaffId : null;
  const secondShiftStaffId = data.shift === "SECOND" ? data.shiftStaffId : null;

  await prisma.$transaction(async (tx) => {
    const shiftStaff = await tx.user.findUnique({
      where: { id: data.shiftStaffId },
      select: { name: true, isActive: true, role: true }
    });
    if (!shiftStaff || !shiftStaff.isActive || shiftStaff.role !== "STAFF") {
      throw new Error("Selected staff member is not active.");
    }
    const signatureText = staffInitials(shiftStaff.name);

    await tx.cBHSEntry.update({
      where: { id: entryId },
      data: {
        clientId: data.clientId,
        shift: data.shift,
        shiftStaffId: data.shiftStaffId,
        firstShiftStaffId,
        secondShiftStaffId,
        date: data.date,
        startTime,
        endTime,
        servicePeriods: data.servicePeriods,
        behaviorFrequencies: JSON.stringify(data.behaviorFrequencies),
        signatureText,
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
