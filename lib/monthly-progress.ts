import { z } from "zod";

export const monthlySections = [
  { key: "health", title: "General Health and Condition", fields: [{ key: "condition", label: "Overall condition during the month" }] },
  { key: "adls", title: "Activities of Daily Living (ADLs)", fields: [{ key: "progress", label: "Progress / changes in assistance" }] },
  { key: "nutrition", title: "Nutrition and Hydration", fields: [{ key: "appetite", label: "Appetite and food intake" }, { key: "fluids", label: "Fluid intake and dietary concerns" }] },
  { key: "medication", title: "Medication Management", fields: [{ key: "concerns", label: "Medication changes, refusals, concerns, and actions taken" }] },
  { key: "mobility", title: "Mobility and Physical Activity", fields: [{ key: "assistance", label: "Mobility and level of assistance" }, { key: "incidents", label: "Falls, injuries, or changes in mobility" }] },
  { key: "mood", title: "Mood, Behavior, and Cognitive Status", fields: [{ key: "mood", label: "General mood and behavior" }, { key: "changes", label: "Changes in memory, cognition, sleep, or behavior" }] },
  { key: "social", title: "Social Activities and Engagement", fields: [{ key: "activities", label: "Activities and social interactions" }] },
  { key: "appointments", title: "Medical Appointments and Health Updates", fields: [{ key: "attended", label: "Appointments attended" }, { key: "orders", label: "New orders, recommendations, or follow-ups" }] },
  { key: "changes", title: "Changes in Condition or Concerns", fields: [{ key: "concerns", label: "Other concerns or context" }] }
] as const;
export type MonthlySectionKey = typeof monthlySections[number]["key"];
export const observationLabels = { NO_CHANGE: "No change observed", CHANGES: "Changes noted", NOT_ASSESSED: "Not assessed" };
export const medicationLabels = { YES: "Yes", NO: "No", SELF_MANAGED: "Self-managed", NOT_ASSESSED: "Not assessed" };
export const adlOptions = ["Bathing and personal hygiene", "Dressing and grooming", "Toileting and incontinence care", "Mobility and transfers", "Oral care"] as const;
export const notificationLabels = { NOTIFIED: "Notified", NOT_REQUIRED: "Not required", PENDING: "Pending" };

const status = z.enum(["", "NO_CHANGE", "CHANGES", "NOT_ASSESSED"]);
const text = z.string().trim().max(3000);
const sectionShape = Object.fromEntries(monthlySections.map((section) => [section.key, z.object({
  status, notes: z.object(Object.fromEntries(section.fields.map((field) => [field.key, text]))).strict()
}).strict()])) as Record<MonthlySectionKey, z.ZodObject<{ status: typeof status; notes: z.ZodObject<Record<string, typeof text>> }>>;

export function validMonth(value: string) { return /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number(value.slice(0, 4)) <= 2200; }
export function validEventDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export const monthlyContentSchema = z.object({
  homeName: z.string().trim().min(2).max(150),
  sections: z.object(sectionShape).strict(),
  adlAssistance: z.array(z.enum(adlOptions)).max(5),
  medicationAdministration: z.enum(["", "YES", "NO", "SELF_MANAGED", "NOT_ASSESSED"]),
  significantChanges: z.enum(["", "YES", "NO", "NOT_ASSESSED"]),
  events: z.array(z.object({
    date: z.string().refine((value) => !value || validEventDate(value), "Choose a valid event date."),
    description: text, action: text,
    notification: z.enum(["", "NOTIFIED", "NOT_REQUIRED", "PENDING"]),
    notifiedWho: z.string().trim().max(300),
    notifiedAt: z.string().refine((value) => !value || (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && validEventDate(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 && Number(value.slice(14, 16)) < 60), "Choose a valid notification date and time."),
    followUp: text
  }).strict()).max(20),
  summary: z.string().trim().max(64000)
}).strict();
export type MonthlyContent = z.infer<typeof monthlyContentSchema>;
export const monthlySaveSchema = z.object({ clientId: z.string().min(1), month: z.string().refine(validMonth, "Choose a valid month."), version: z.number().int().min(0), intent: z.enum(["draft", "complete"]), content: monthlyContentSchema }).strict();

export function blankMonthlyContent(): MonthlyContent {
  return { homeName: "Zagol Seniors Care LLC", sections: Object.fromEntries(monthlySections.map((section) => [section.key, { status: "", notes: Object.fromEntries(section.fields.map((field) => [field.key, ""])) }])) as MonthlyContent["sections"], adlAssistance: [], medicationAdministration: "", significantChanges: "", events: [], summary: "" };
}
export function currentMonth() { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7); }
export function monthLabel(month: string) { return new Date(month + "-01T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" }); }
export function completionIssues(content: MonthlyContent, month: string) {
  const issues: string[] = [];
  for (const section of monthlySections) {
    const value = content.sections[section.key];
    if (!value.status) issues.push(section.title + ": select an observation status.");
    if (value.status === "CHANGES" && !Object.values(value.notes).some((note) => note.trim()) && !(section.key === "changes" && content.events.some((event) => event.description.trim()))) issues.push(section.title + ": describe the changes noted.");
  }
  if (!content.medicationAdministration) issues.push("Medication Management: select the administration status.");
  if (content.medicationAdministration === "NO" && !content.sections.medication.notes.concerns) issues.push("Medication Management: document refusals or concerns and actions taken.");
  if (!content.significantChanges) issues.push("Select whether significant changes occurred.");
  if (content.significantChanges === "YES" && !content.events.length) issues.push("Add at least one significant change.");
  content.events.forEach((event, index) => {
    const prefix = "Significant change " + (index + 1) + ": ";
    if (!event.date || event.date.slice(0, 7) !== month) issues.push(prefix + "choose a date within the reporting month.");
    if (!event.description.trim() || !event.action.trim()) issues.push(prefix + "record what happened and the action taken.");
    if (!event.notification) issues.push(prefix + "select the notification status.");
    if (event.notification === "NOTIFIED" && (!event.notifiedWho.trim() || !event.notifiedAt)) issues.push(prefix + "record who was notified and when.");
    if (event.notification === "PENDING" && !event.followUp.trim()) issues.push(prefix + "record the pending follow-up.");
  });
  if (content.events.length && content.significantChanges !== "YES") issues.push("Significant-change entries are present. Select Yes or remove those entries.");
  if (content.summary.trim().length < 10) issues.push("Enter an overall monthly summary (at least 10 characters).");
  return issues;
}

export function suggestedMonthlySummary(content: MonthlyContent) {
  // Extract documented sentences locally; never invent findings or cut a clinical sentence mid-clause.
  type Highlight = { text: string[]; priority: number; event?: boolean };
  const highlights: Highlight[] = [];
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const routineOnly = /^(?:none|stable|no (?:changes?|concerns?|falls|injuries|incidents)(?: (?:observed|noted|reported))?)[.!]?$/i;
  const sentences = (value: string, limit = 1) => {
    const cleaned = value.trim();
    if (!cleaned || routineOnly.test(cleaned)) return [];
    const chunks = Array.from(segmenter.segment(cleaned), (part) => part.segment.replace(/\s+/g, " ").trim()).filter(Boolean);
    const result: string[] = [];
    for (let index = 0; index < chunks.length && result.length < limit; index++) {
      let sentence = chunks[index];
      // A provider's title is not the end of a meaningful observation.
      while (/\b(?:Dr|Mr|Mrs|Ms|Prof)\.$/i.test(sentence) && chunks[index + 1]) sentence += " " + chunks[++index];
      result.push(!/[.!?]$/.test(sentence) ? sentence + "." : sentence);
    }
    return result;
  };
  const firstSentence = (value: string) => sentences(value)[0] ?? "";
  const add = (values: string[], priority: number, limit = 1) => {
    const text = values.flatMap((value) => sentences(value, limit));
    if (text.length) highlights.push({ text, priority });
  };

  for (const event of content.events) {
    const description = firstSentence(event.description);
    if (!description) continue;
    const date = event.date ? event.date.slice(5, 7) + "/" + event.date.slice(8, 10) + ": " : "";
    const text = [date + description, firstSentence(event.action)];
    const followUp = firstSentence(event.followUp);
    if (followUp) text.push("Follow-up: " + followUp);
    highlights.push({ text: text.filter(Boolean), priority: 100, event: true });
  }
  add([content.sections.changes.notes.concerns], 95);
  add([content.sections.mobility.notes.incidents], 94);
  add([content.sections.medication.notes.concerns], 93, 2);
  if (content.medicationAdministration === "NO" && !content.sections.medication.notes.concerns.trim()) {
    add(["Medication administration concerns were reported; details have not been entered."], 93);
  }
  const priority: Record<MonthlySectionKey, number> = { health: 90, mobility: 89, nutrition: 88, mood: 87, medication: 86, changes: 85, adls: 80, appointments: 79, social: 70 };
  for (const section of monthlySections) {
    if (content.sections[section.key].status === "CHANGES") {
      add(section.fields.map((field) => content.sections[section.key].notes[field.key]), priority[section.key]);
    }
  }
  // New orders and follow-up can matter even when the section's observation selector was left unchanged.
  add([content.sections.appointments.notes.orders], 84, 2);
  if (content.significantChanges === "YES" && !content.events.some((event) => event.description.trim())) {
    add(["Significant changes were reported; details have not been entered."], 99);
  }

  if (!highlights.length) {
    for (const section of monthlySections) {
      add(section.fields.map((field) => content.sections[section.key].notes[field.key]), 1);
    }
  }
  highlights.sort((a, b) => b.priority - a.priority);
  const selected: string[] = [];
  const seen = new Set<string>();
  let groups = 0;
  let selectedEvents = 0;
  let words = 0;
  for (const highlight of highlights) {
    if (groups >= 4) break;
    const fresh = highlight.text.filter((sentence, index, all) => !seen.has(sentence.toLowerCase()) && all.findIndex((value) => value.toLowerCase() === sentence.toLowerCase()) === index);
    if (!fresh.length) continue;
    const count = fresh.join(" ").split(/\s+/).length;
    // Aim for a short paragraph, but retain an indivisible important sentence rather than truncating it.
    if (words && words + count > 120) continue;
    selected.push(...fresh);
    fresh.forEach((sentence) => seen.add(sentence.toLowerCase()));
    words += count;
    groups++;
    if (highlight.event) selectedEvents++;
  }
  if (selected.length) {
    if (selectedEvents < highlights.filter((item) => item.event).length) selected.push("Other incidents are listed in the report.");
    return selected.join(" ");
  }

  const statuses = monthlySections.map((section) => content.sections[section.key].status);
  if (statuses.includes("CHANGES")) return "Changes were noted, but details have not been entered.";
  if (statuses.every((value) => value === "NOT_ASSESSED")) return "The monthly observations were not assessed.";
  if (statuses.includes("NO_CHANGE")) {
    return "No changes were noted in the assessed areas this month." + (statuses.includes("NOT_ASSESSED") ? " Some areas were not assessed." : "");
  }
  if (content.significantChanges === "NO") return "No significant changes were reported this month.";
  if (content.significantChanges === "NOT_ASSESSED") return "Significant changes were not assessed this month.";
  return "";
}
