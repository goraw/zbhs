import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";

type SummaryEntry = {
  date: Date;
  behaviorFrequencies: string;
};

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function sentenceList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function lowerFirst(value: string) {
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function interventionPhrase(value: string) {
  return lowerFirst(value.replace(/\.$/, ""));
}

function variantIndex(clientName: string, weekStart: Date) {
  const key = `${clientName}-${weekStart.toISOString().slice(0, 10)}`;
  return [...key].reduce((total, char) => total + char.charCodeAt(0), 0) % 4;
}

export function generatedSummaryNarrative(clientName: string, weekStart: Date, entries: SummaryEntry[]) {
  const lineTotals = new Map<number, number>();
  const documentedDays = new Set(entries.map((entry) => shortDate(entry.date)));
  const variant = variantIndex(clientName, weekStart);

  for (const entry of entries) {
    const frequencies = parseBehaviorFrequencies(entry.behaviorFrequencies);
    for (const [lineValue, frequencyValue] of Object.entries(frequencies)) {
      const line = Number(lineValue);
      const frequency = Number(frequencyValue);
      if (!Number.isInteger(line) || !Number.isFinite(frequency) || frequency <= 0) continue;
      lineTotals.set(line, (lineTotals.get(line) ?? 0) + frequency);
    }
  }

  const observedLines = cbhsStandardLines
    .map((line) => ({ ...line, total: lineTotals.get(line.line) ?? 0 }))
    .filter((line) => line.total > 0)
    .sort((left, right) => right.total - left.total || left.line - right.line);

  if (!observedLines.length) {
    const noFrequencyOpeners = [
      `${clientName} received supportive supervision across ${documentedDays.size} documented day${documentedDays.size === 1 ? "" : "s"} this week.`,
      `Across ${documentedDays.size} documented day${documentedDays.size === 1 ? "" : "s"}, ${clientName} received routine supportive supervision.`,
      `Supportive supervision was documented for ${clientName} on ${documentedDays.size} day${documentedDays.size === 1 ? "" : "s"} this week.`,
      `This week's documentation for ${clientName} reflected routine supportive supervision across ${documentedDays.size} day${documentedDays.size === 1 ? "" : "s"}.`
    ];
    return `${noFrequencyOpeners[variant]} Staff maintained routine monitoring and plan-based support; no behavior frequencies were recorded in the daily logs.`;
  }

  const dominant = observedLines[0];
  const otherBehaviors = observedLines.slice(1, 4).map((line) => lowerFirst(line.behavior));
  const mainInterventions = observedLines.slice(0, 3).map((line) => interventionPhrase(line.intervention));
  const isMichaelFiveDominant = clientName.toLowerCase().includes("michael") && dominant.line === 5;

  const openers = [
    `Staff focused on ${clientName}'s most common observed behavior, ${lowerFirst(dominant.behavior)}.`,
    `Care during the week centered on ${lowerFirst(dominant.behavior)}, which was the main behavior observed for ${clientName}.`,
    `${clientName}'s support this week primarily addressed ${lowerFirst(dominant.behavior)}.`,
    `The primary documented concern for ${clientName} this week was ${lowerFirst(dominant.behavior)}.`
  ];

  const secondaryPhrases = [
    `Less frequent concerns included ${sentenceList(otherBehaviors)}.`,
    `Additional lower-frequency observations included ${sentenceList(otherBehaviors)}.`,
    `Staff also documented occasional ${sentenceList(otherBehaviors)}.`,
    `Other observed concerns during the week included ${sentenceList(otherBehaviors)}.`
  ];

  const supportPhrases = [
    `Support included ${sentenceList(mainInterventions)}.`,
    `Interventions used included ${sentenceList(mainInterventions)}.`,
    `Staff responded with ${sentenceList(mainInterventions)}.`,
    `Caregiver support included ${sentenceList(mainInterventions)}.`
  ];

  const closingPhrases = isMichaelFiveDominant
    ? [
        "Staff noted that giving Michael space after a calm prompt was often the most effective way to help him settle and avoid escalation.",
        "Giving Michael space after calm reassurance was frequently the most helpful way to support de-escalation.",
        "Staff observed that Michael often settled best when given space following a calm prompt.",
        "A calm prompt followed by space continued to be one of the most effective supports for helping Michael settle."
      ]
    : [
        "Staff continued routine monitoring, calm redirection, and care-plan-based support throughout the week.",
        "Staff maintained routine monitoring and used calm, plan-based support across the week.",
        "Care remained focused on consistent monitoring, calm redirection, and supportive follow-through.",
        "Staff continued to provide calm redirection and routine support consistent with the care plan."
      ];

  const sentences = [openers[variant]];

  if (otherBehaviors.length) {
    sentences.push(secondaryPhrases[variant]);
  }

  sentences.push(supportPhrases[variant]);
  sentences.push(closingPhrases[variant]);

  return sentences.join(" ");
}
