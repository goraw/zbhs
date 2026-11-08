import { monthlySections, type MonthlyContent } from "@/lib/monthly-progress";

export function noChangeMonthlyContent(content: MonthlyContent): MonthlyContent {
  // A caregiver must confirm this option; never overwrite existing narrative or incidents.
  if (content.events.length || content.summary.trim() || content.significantChanges === "YES" || content.medicationAdministration === "NO" || monthlySections.some((section) => content.sections[section.key].status === "CHANGES" || Object.values(content.sections[section.key].notes).some((note) => note.trim()))) {
    throw new Error("Existing observations or incidents are present. Review and update the report manually.");
  }
  const next = structuredClone(content);
  for (const section of monthlySections) {
    if (!next.sections[section.key].status) next.sections[section.key].status = "NO_CHANGE";
  }
  next.significantChanges = "NO";
  next.summary = "No significant changes were observed this month. Daily care needs remained unchanged.";
  return next;
}
