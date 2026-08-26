export const cbhsStandardLines = [
  {
    line: 1,
    behavior: "Inappropriate Nakedness",
    intervention: "Verbal cueing, check temperature/clothing comfort, escort to private area."
  },
  {
    line: 2,
    behavior: "Sexual Acting Out / Object Insertion",
    intervention: "Supervision during toileting, set firm/neutral limits, redirect to private location."
  },
  {
    line: 3,
    behavior: "Inappropriate Toileting",
    intervention: "1:1 hygiene assistance post-voiding, area clearance, active diversion tasks."
  },
  {
    line: 4,
    behavior: "Wandering / Exit Seeking",
    intervention: "Redirection to safe areas, offer accompanied walks, continuous visual monitoring."
  },
  {
    line: 5,
    behavior: "Repetitive Pacing / Agitation",
    intervention: "Reassurance, low-stimulation environment, engage in repetitive/structured activity."
  },
  {
    line: 6,
    behavior: "Boundary Intrusion / Substance Triggers",
    intervention: "Clear boundary setting, gentle 1:1 redirection, weekly behavior plan adherence."
  },
  {
    line: 7,
    behavior: "Other",
    intervention: "Document behavior and intervention according to the care plan."
  }
] as const;

export type BehaviorFrequencyMap = Record<string, string>;

export function parseBehaviorFrequencies(value: string | null | undefined): BehaviorFrequencyMap {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([key, frequency]) => [key, String(frequency ?? "")])
    );
  } catch {
    return {};
  }
}
