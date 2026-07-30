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

export const cbhsEntrySchema = z.object({
  clientId: z.string().min(1),
  date: z.coerce.date(),
  servicePeriods: z.string().min(2).max(1000),
  behaviorFrequencies: z.record(z.string().max(20)).default({}),
  signatureText: z.string().min(2).max(120),
  password: z.string().min(1)
});

export const weeklySummarySchema = z.object({
  clientId: z.string().min(1),
  weekStart: z.coerce.date(),
  narrative: z.string().min(10).max(8000),
  attestationName: z.string().max(120).optional().transform((value) => value || undefined),
  signatureText: z.string().max(120).optional().transform((value) => value || undefined),
  password: z.string().optional()
});
