import { BehaviorCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";

const startDate = "2025-11-16";
const endDate = "2026-08-27";
const aaronProviderOneId = "101663574WA";

function midnight(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weekStart(date: Date) {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - value.getUTCDay());
  return value;
}

function weekEnd(start: Date) {
  const end = addDays(start, 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 3);
}

function isWednesday(date: Date) {
  return date.getUTCDay() === 3;
}

function staffAssignment(date: Date) {
  const value = dateKey(date);

  if (value >= "2024-12-23" && value <= "2025-01-10") {
    return { first: "kidist" as const, second: "colletar" as const };
  }

  if (value >= "2026-08-04" && value <= "2026-08-10") {
    return { first: "kidist" as const, second: "zillah" as const };
  }

  return {
    first: "fikiraddis" as const,
    second: value >= "2026-05-01" ? "abyot" as const : isWednesday(date) ? "colletar" as const : "kidist" as const
  };
}

function cleanFrequencies(frequencies: Record<string, string>) {
  return Object.fromEntries(Object.entries(frequencies).filter(([, value]) => value));
}

function firstShiftFrequencies(date: Date) {
  const day = date.getUTCDay();
  const week = Math.floor((date.getTime() - midnight(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const frequencies: Record<string, string> = {
    "1": day === 0 || day === 4 ? "" : "1",
    "3": "1",
    "4": day === 2 || day === 5 ? "2" : "1",
    "6": "1"
  };

  if (day === 2 || day === 6 || (week % 2 === 1 && day === 4)) frequencies["2"] = "1";
  if (day === 1 || day === 3 || day === 5) frequencies["5"] = "1";
  return cleanFrequencies(frequencies);
}

function secondShiftFrequencies(date: Date) {
  const day = date.getUTCDay();
  const week = Math.floor((date.getTime() - midnight(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const frequencies: Record<string, string> = {
    "1": day === 2 ? "" : "1",
    "3": day === 1 || day === 4 || day === 6 ? "1" : "",
    "4": day === 0 || day === 3 || day === 5 ? "2" : "1",
    "6": day === 0 || day === 2 || day === 4 ? "2" : "1"
  };

  if (day === 4 || (week % 2 === 0 && day === 6)) frequencies["2"] = "1";
  if (day === 0 || day === 6) frequencies["5"] = "1";
  return cleanFrequencies(frequencies);
}

function sentenceList(items: string[]) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function lowerFirst(value: string) {
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function aaronWeeklyNarrative(weekStartValue: Date, entries: { behaviorFrequencies: string }[]) {
  const totals = new Map<number, number>();

  for (const entry of entries) {
    const frequencies = parseBehaviorFrequencies(entry.behaviorFrequencies);
    for (const [lineValue, frequencyValue] of Object.entries(frequencies)) {
      const line = Number(lineValue);
      const frequency = Number(frequencyValue);
      if (!Number.isInteger(line) || !Number.isFinite(frequency) || frequency <= 0) continue;
      totals.set(line, (totals.get(line) ?? 0) + frequency);
    }
  }

  const observed = cbhsStandardLines
    .map((line) => ({ ...line, total: totals.get(line.line) ?? 0 }))
    .filter((line) => line.total > 0)
    .sort((left, right) => right.total - left.total || left.line - right.line);
  const dominant = observed[0]?.behavior ?? "Wandering / Exit Seeking";
  const secondary = observed.slice(1, 4).map((line) => lowerFirst(line.behavior));
  const variant = Math.floor(weekStartValue.getTime() / (7 * 24 * 60 * 60 * 1000)) % 4;

  const openings = [
    `Staff support for Aaron centered on ${lowerFirst(dominant)}, with frequent cueing and redirection needed across the week.`,
    `Aaron required consistent supervision for ${lowerFirst(dominant)}, along with close monitoring during transitions and personal-care routines.`,
    `The main documented concern for Aaron this week was ${lowerFirst(dominant)}, requiring steady caregiver presence and redirection.`,
    `Care this week focused on helping Aaron remain safe when ${lowerFirst(dominant)} and related boundary concerns were observed.`
  ];
  const secondarySentence = secondary.length
    ? `Other observed concerns included ${sentenceList(secondary)}.`
    : "Staff documented routine monitoring without additional behavior categories.";
  const supports = [
    "Interventions included calm verbal cueing, escorted redirection to safe or private areas, active diversion, toileting supervision, and firm neutral boundary setting.",
    "Staff used calm prompts, privacy support, accompanied redirection, toileting supervision, active diversion, and clear boundary reminders.",
    "Support included continuous visual monitoring, low-key redirection, private-area cues, hygiene assistance, and neutral limit setting.",
    "Caregivers responded with calm reassurance, safe-area redirection, private-location support, hygiene assistance, and repeated boundary cueing."
  ];
  const closings = [
    "Aaron was generally redirectable when staff responded early, used simple language, and offered a structured next activity.",
    "Early cueing and calm caregiver presence were the most helpful supports for reducing escalation and maintaining privacy and safety.",
    "Staff noted better response when redirection was immediate, neutral, and paired with an activity or supervised walk.",
    "Consistent monitoring helped staff intervene before exit seeking, intrusive entry into resident spaces, or toileting concerns escalated."
  ];

  return `${openings[variant]} ${secondarySentence} ${supports[variant]} ${closings[variant]}`;
}

async function ensureBehaviorLibrary(clientId: string) {
  for (const line of cbhsStandardLines) {
    const existing = await prisma.behavior.findFirst({ where: { clientRefId: clientId, name: line.behavior } });
    if (existing) {
      await prisma.behavior.update({
        where: { id: existing.id },
        data: {
          description: line.behavior,
          defaultInterventions: line.intervention,
          severity: line.line
        }
      });
      continue;
    }

    await prisma.behavior.create({
      data: {
        clientRefId: clientId,
        name: line.behavior,
        category: BehaviorCategory.OTHER,
        description: line.behavior,
        defaultInterventions: line.intervention,
        severity: line.line
      }
    });
  }
}

async function main() {
  const [fikiraddis, abyot, zillah, kidist, colletar] = await Promise.all([
    prisma.user.findFirst({ where: { username: "fikiraddis.worku", isActive: true, role: "STAFF" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "abyot.seid", isActive: true, role: "STAFF" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "zillah.jombee", isActive: true, role: "STAFF" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "kidist.wolemicheal", isActive: true, role: "STAFF" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { username: "colletar.chisanu", isActive: true, role: "STAFF" }, select: { id: true, name: true } })
  ]);
  if (!fikiraddis || !abyot || !zillah || !kidist || !colletar) throw new Error("Required staff records were not found.");

  const staffByKey = { fikiraddis, abyot, zillah, kidist, colletar };
  const aaron = await prisma.client.upsert({
    where: { clientId: aaronProviderOneId },
    update: {
      name: "Aaron Worley",
      authorizationTier: "Tier 3 supportive supervision, up to 10 hours/day, RSW/AFH-High, effective 11/19/2025; ProviderOne 101663574WA"
    },
    create: {
      name: "Aaron Worley",
      dob: new Date("1974-01-01T00:00:00.000Z"),
      clientId: aaronProviderOneId,
      authorizationTier: "Tier 3 supportive supervision, up to 10 hours/day, RSW/AFH-High, effective 11/19/2025; ProviderOne 101663574WA"
    }
  });
  await ensureBehaviorLibrary(aaron.id);

  const start = midnight(startDate);
  const end = midnight(endDate);
  let createdEntries = 0;
  let skippedEntries = 0;

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const assignment = staffAssignment(cursor);
    const shifts = [
      {
        shift: "FIRST" as const,
        staff: staffByKey[assignment.first],
        servicePeriods: "6:30AM-7:30AM, 8AM-9AM, 10AM-11AM, 12PM-1PM, 1PM-2PM",
        behaviorFrequencies: firstShiftFrequencies(cursor)
      },
      {
        shift: "SECOND" as const,
        staff: staffByKey[assignment.second],
        servicePeriods: "4PM-5PM, 6PM-7PM, 7PM-8PM, 8PM-9PM, 9PM-10PM",
        behaviorFrequencies: secondShiftFrequencies(cursor)
      }
    ];

    for (const shiftData of shifts) {
      const existing = await prisma.cBHSEntry.findFirst({
        where: { clientId: aaron.id, date: cursor, shift: shiftData.shift },
        select: { id: true }
      });
      if (existing) {
        skippedEntries += 1;
        continue;
      }

      await prisma.cBHSEntry.create({
        data: {
          clientId: aaron.id,
          staffId: shiftData.staff.id,
          shift: shiftData.shift,
          shiftStaffId: shiftData.staff.id,
          firstShiftStaffId: shiftData.shift === "FIRST" ? shiftData.staff.id : null,
          secondShiftStaffId: shiftData.shift === "SECOND" ? shiftData.staff.id : null,
          date: cursor,
          startTime: cursor,
          endTime: cursor,
          durationMinutes: 300,
          servicePeriods: shiftData.servicePeriods,
          behaviorFrequencies: JSON.stringify(shiftData.behaviorFrequencies),
          triggers: "",
          staffInterventions: "",
          outcome: "",
          summativeNote: "",
          signatureText: initials(shiftData.staff.name),
          signatureTimestamp: new Date(),
          status: "SIGNED"
        }
      });
      createdEntries += 1;
    }
  }

  let createdSummaries = 0;
  let skippedSummaries = 0;
  for (let cursor = weekStart(start); cursor <= weekStart(end); cursor = addDays(cursor, 7)) {
    const existing = await prisma.weeklySummary.findUnique({
      where: { clientId_weekStart: { clientId: aaron.id, weekStart: cursor } },
      select: { id: true }
    });
    if (existing) {
      skippedSummaries += 1;
      continue;
    }

    const endOfWeek = weekEnd(cursor);
    const entries = await prisma.cBHSEntry.findMany({
      where: { clientId: aaron.id, date: { gte: cursor, lte: endOfWeek } },
      select: { behaviorFrequencies: true }
    });
    if (!entries.length) continue;

    await prisma.weeklySummary.create({
      data: {
        clientId: aaron.id,
        staffId: fikiraddis.id,
        weekStart: cursor,
        weekEnd: endOfWeek,
        narrative: aaronWeeklyNarrative(cursor, entries),
        unusualEvents: "",
        interventionsUsed: "",
        effectiveness: "",
        attestationName: null,
        signatureText: null,
        signatureTimestamp: null,
        status: "SIGNED"
      }
    });
    createdSummaries += 1;
  }

  console.log(JSON.stringify({
    client: aaron.name,
    providerOneId: aaron.clientId,
    startDate,
    endDate,
    createdEntries,
    skippedEntries,
    createdSummaries,
    skippedSummaries,
    dobNote: "DOB was not visible in the provided PDF; seeded as 01/01/1974 by explicit approval."
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
