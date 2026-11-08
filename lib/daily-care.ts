import { z } from "zod";
import { validEventDate } from "@/lib/monthly-progress";

export function todayPacific() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export const dailyCareSchema = z.object({
  id: z.string().optional(),
  version: z.number().int().min(1).optional(),
  clientId: z.string().min(1, "Select a resident."),
  date: z.string().refine(validEventDate, "Choose a valid date.").refine((value) => value <= todayPacific(), "Notes cannot be dated in the future."),
  note: z.string().trim().min(1, "Enter a daily note.").max(10000)
}).strict().refine((value) => !value.id || !!value.version, "Reload this note before editing.");
