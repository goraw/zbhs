import { z } from "zod";

export const userSchema = z.object({
  name: z.string().min(2).max(100),
  username: z.string().min(3).max(100).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(12),
  role: z.enum(["SUPER_ADMIN", "STAFF"])
});

export const clientSchema = z.object({
  name: z.string().min(2).max(100),
  dob: z.coerce.date(),
  clientId: z.string().min(2).max(80),
  authorizationTier: z.string().min(2).max(100)
});

export const behaviorSchema = z.object({
  clientRefId: z.string().optional().transform((value) => value || undefined),
  name: z.string().min(2).max(120),
  category: z.enum(["AGGRESSIVE", "SELF_HARM_RISK", "INTRUSIVE", "PROPERTY_DESTRUCTION", "OTHER"]),
  description: z.string().min(5).max(2000),
  defaultInterventions: z.string().min(5).max(3000),
  severity: z.coerce.number().int().min(1).max(5)
});

type ShiftPeriodValue = "FIRST" | "SECOND" | "THIRD";

function timeToMinutes(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3].toUpperCase();
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
  if (hours === 12) hours = 0;
  return (meridiem === "PM" ? hours + 12 : hours) * 60 + minutes;
}

function periodParts(period: string) {
  const [start, end] = period.split(/\s*-\s*/);
  const startMinutes = start ? timeToMinutes(start) : null;
  const endMinutes = end ? timeToMinutes(end) : null;
  return { startMinutes, endMinutes };
}

function shiftRelativeMinutes(minutes: number, shift: ShiftPeriodValue) {
  if (shift !== "THIRD") return minutes;
  return minutes < 6 * 60 ? minutes + 24 * 60 : minutes;
}

function isInsideShift(startMinutes: number, endMinutes: number, shift: ShiftPeriodValue) {
  const start = shiftRelativeMinutes(startMinutes, shift);
  const end = shiftRelativeMinutes(endMinutes, shift);

  if (end <= start) return false;
  if (shift === "FIRST") return start >= 6 * 60 && end <= 14 * 60;
  if (shift === "SECOND") return start >= 14 * 60 && end <= 16 * 60;
  return start >= 22 * 60 && end <= 30 * 60;
}

function validServicePeriods(value: string, shift: ShiftPeriodValue) {
  return value
    .split(/[\n,;]+/)
    .map((period) => period.trim())
    .filter(Boolean)
    .every((period) => {
      const { startMinutes, endMinutes } = periodParts(period);
      if (startMinutes === null || endMinutes === null) return false;
      return isInsideShift(startMinutes, endMinutes, shift);
    });
}

export const cbhsEntrySchema = z.object({
  clientId: z.string().min(1),
  shift: z.enum(["FIRST", "SECOND", "THIRD"]),
  shiftStaffId: z.string().min(1),
  date: z.coerce.date(),
  servicePeriods: z.string().min(2).max(1000),
  behaviorFrequencies: z.record(z.string().regex(/^$|^(10|[1-9])$/, "Frequency must be blank or 1-10.")).default({})
}).superRefine((value, context) => {
  if (!validServicePeriods(value.servicePeriods, value.shift)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["servicePeriods"],
      message: "Each service period must fit inside the selected shift."
    });
    return;
  }
});

export const weeklySummarySchema = z.object({
  clientId: z.string().min(1),
  weekStart: z.coerce.date(),
  narrative: z.string().min(10).max(8000),
  attestationName: z.string().max(120).optional().transform((value) => value || undefined),
  signatureText: z.string().max(120).optional().transform((value) => value || undefined),
  password: z.string().optional()
});
