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

function servicePeriodCount(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((period) => period.trim())
    .filter(Boolean).length;
}

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

function validServicePeriodOrder(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((period) => period.trim())
    .filter(Boolean)
    .every((period) => {
      const [start, end] = period.split(/\s*-\s*/);
      const startMinutes = start ? timeToMinutes(start) : null;
      const endMinutes = end ? timeToMinutes(end) : null;
      return startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;
    });
}

function behaviorFrequencyTotal(value: Record<string, string>) {
  return Object.values(value).reduce((total, frequency) => total + (frequency ? Number(frequency) : 0), 0);
}

export const cbhsEntrySchema = z.object({
  clientId: z.string().min(1),
  shift: z.enum(["FIRST", "SECOND", "THIRD"]),
  shiftStaffId: z.string().min(1),
  date: z.coerce.date(),
  servicePeriods: z.string().min(2).max(1000),
  behaviorFrequencies: z.record(z.string().regex(/^$|^(10|[1-9])$/, "Frequency must be blank or 1-10.")).default({})
}).superRefine((value, context) => {
  if (!validServicePeriodOrder(value.servicePeriods)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["servicePeriods"],
      message: "Each service period must have an end time greater than the start time."
    });
    return;
  }

  const periods = servicePeriodCount(value.servicePeriods);
  const frequencies = behaviorFrequencyTotal(value.behaviorFrequencies);
  if (periods !== frequencies) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["servicePeriods"],
      message: "Service period count must match the total behavior frequency count."
    });
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
