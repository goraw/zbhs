export const cbhsStandardLines = [
  {
    line: 1,
    behavior: "Verbal outburst/agitation",
    intervention: "verbal redirection and calm presence"
  },
  {
    line: 2,
    behavior: "Task refusal/resistance",
    intervention: "active listening and positive reinforcement"
  },
  {
    line: 3,
    behavior: "Boundary intrusion/personal space conflict",
    intervention: "physical redirection and low-stimulation spacing"
  },
  {
    line: 4,
    behavior: "Restlessness/wandering",
    intervention: "guided coping exercise or walking activity"
  },
  {
    line: 5,
    behavior: "Response to psychosis/hallucinations",
    intervention: "reality testing and reassuring cues"
  },
  {
    line: 6,
    behavior: "Nighttime/transition distress",
    intervention: "environmental modification (reducing noise/lighting)"
  },
  {
    line: 7,
    behavior: "Intimidating posture/verbal abuse",
    intervention: "de-escalation protocol and offer of quiet space"
  },
  {
    line: 8,
    behavior: "Property disruption/throwing objects",
    intervention: "safe area clearance and 1:1 active diversion"
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
