import { BehaviorCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";

const providerOneId = "101663574WA";
const startDate = "2025-11-16";
const endDate = "2026-09-14";

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

function isWednesday(date: Date) {
  return date.getUTCDay() === 3;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 3);
}

function staffAssignment(date: Date) {
  const value = dateKey(date);

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
  const weekIndex = Math.floor((date.getTime() - midnight(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const frequencies: Record<string, string> = {
    "1": day === 2 || day === 4 || day === 6 ? "1" : "",
    "3": day === 0 || day === 1 || day === 3 || day === 5 ? "1" : "",
    "4": day === 0 || day === 3 || day === 5 ? "2" : "1",
    "6": day === 2 || day === 4 ? "2" : "1"
  };

  if (day === 2 || (weekIndex % 2 === 0 && day === 5)) frequencies["2"] = "1";
  if (day === 1 || day === 4) frequencies["5"] = "1";
  return cleanFrequencies(frequencies);
}

function hasSecondShiftLog(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 2 || day === 4 || day === 6;
}

function secondShiftFrequencies(date: Date) {
  const day = date.getUTCDay();
  const weekIndex = Math.floor((date.getTime() - midnight(startDate).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const frequencies: Record<string, string> = {
    "1": day === 0 || day === 6 ? "1" : "",
    "4": "1",
    "6": day === 2 || day === 4 ? "2" : "1"
  };

  if (day === 4 || (weekIndex % 2 === 1 && day === 6)) frequencies["2"] = "1";
  if (day === 0) frequencies["3"] = "1";
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

function weeklyNarrative(weekStartValue: Date, entries: { behaviorFrequencies: string }[]) {
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
    `Aaron's support this week primarily addressed ${lowerFirst(dominant)} with repeated redirection and caregiver monitoring.`,
    `Care during the week centered on ${lowerFirst(dominant)}, with staff providing steady supervision during higher-risk parts of the day.`,
    `The main documented concern for Aaron was ${lowerFirst(dominant)}, requiring calm prompts and close observation.`,
    `Staff focused on Aaron's recurring ${lowerFirst(dominant)} while continuing routine support for privacy, safety, and boundaries.`
  ];
  const secondarySentence = secondary.length ? `Additional observed concerns included ${sentenceList(secondary)}.` : "";
  const supports = [
    "Interventions included calm verbal cueing, escorted redirection to safe or private areas, toileting support, active diversion, and neutral limit setting.",
    "Staff used simple cues, privacy support, accompanied redirection, hygiene assistance, diversion activities, and clear boundary reminders.",
    "Support included visual monitoring, quiet redirection, private-area prompts, toileting assistance, and firm but neutral boundary setting.",
    "Caregivers responded with calm reassurance, safe-area redirection, activity engagement, toileting supervision, and repeated boundary cueing."
  ];
  const closings = [
    "Aaron was usually redirectable when staff intervened early and offered a structured next activity.",
    "Early support and calm language helped reduce escalation and maintain privacy and safety.",
    "Aaron responded best when redirection was immediate, respectful, and paired with a supervised activity or walk.",
    "Consistent monitoring helped staff respond before exit seeking, intrusive room entry, or toileting concerns escalated."
  ];

  return [openings[variant], secondarySentence, supports[variant], closings[variant]].filter(Boolean).join(" ");
}

async function clearAaronData() {
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { clientId: providerOneId },
        { name: { equals: "Aaron Worley" } },
        { name: { equals: "WORLEY, AARON A" } }
      ]
    },
    select: { id: true, name: true, clientId: true }
  });
  const clientIds = clients.map((client) => client.id);

  if (!clientIds.length) {
    return { clients: 0, entries: 0, summaries: 0, behaviors: 0 };
  }

  const [summaries, entries, behaviors] = await prisma.$transaction([
    prisma.weeklySummary.deleteMany({ where: { clientId: { in: clientIds } } }),
    prisma.cBHSEntry.deleteMany({ where: { clientId: { in: clientIds } } }),
    prisma.behavior.deleteMany({ where: { clientRefId: { in: clientIds } } })
  ]);
  const deletedClients = await prisma.client.deleteMany({ where: { id: { in: clientIds } } });

  return {
    clients: deletedClients.count,
    entries: entries.count,
    summaries: summaries.count,
    behaviors: behaviors.count
  };
}

async function createBehaviorLibrary(clientId: string) {
  for (const line of cbhsStandardLines) {
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

  const deleted = await clearAaronData();
  const staffByKey = { fikiraddis, abyot, zillah, kidist, colletar };
  const aaron = await prisma.client.create({
    data: {
      name: "Aaron Worley",
      dob: new Date("1974-01-01T00:00:00.000Z"),
      clientId: providerOneId,
      authorizationTier: "Tier 2 supportive supervision, 2.1-6 hours/day, RSW/AFH-High; ProviderOne 101663574WA; assessment 10/08/2025, completed 10/29/2025"
    }
  });
  await createBehaviorLibrary(aaron.id);

  const start = midnight(startDate);
  const end = midnight(endDate);
  let createdEntries = 0;

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    const assignment = staffAssignment(cursor);
    const firstStaff = staffByKey[assignment.first];

    await prisma.cBHSEntry.create({
      data: {
        clientId: aaron.id,
        staffId: firstStaff.id,
        shift: "FIRST",
        shiftStaffId: firstStaff.id,
        firstShiftStaffId: firstStaff.id,
        secondShiftStaffId: null,
        date: cursor,
        startTime: cursor,
        endTime: cursor,
        durationMinutes: 180,
        servicePeriods: "8AM-9AM, 12PM-1PM, 1PM-2PM",
        behaviorFrequencies: JSON.stringify(firstShiftFrequencies(cursor)),
        triggers: "",
        staffInterventions: "",
        outcome: "",
        summativeNote: "",
        signatureText: initials(firstStaff.name),
        signatureTimestamp: new Date(),
        status: "SIGNED"
      }
    });
    createdEntries += 1;

    if (hasSecondShiftLog(cursor)) {
      const secondStaff = staffByKey[assignment.second];
      await prisma.cBHSEntry.create({
        data: {
          clientId: aaron.id,
          staffId: secondStaff.id,
          shift: "SECOND",
          shiftStaffId: secondStaff.id,
          firstShiftStaffId: null,
          secondShiftStaffId: secondStaff.id,
          date: cursor,
          startTime: cursor,
          endTime: cursor,
          durationMinutes: 120,
          servicePeriods: "6PM-7PM, 8PM-9PM",
          behaviorFrequencies: JSON.stringify(secondShiftFrequencies(cursor)),
          triggers: "",
          staffInterventions: "",
          outcome: "",
          summativeNote: "",
          signatureText: initials(secondStaff.name),
          signatureTimestamp: new Date(),
          status: "SIGNED"
        }
      });
      createdEntries += 1;
    }
  }

  let createdSummaries = 0;
  for (let cursor = weekStart(start); cursor <= weekStart(end); cursor = addDays(cursor, 7)) {
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
        narrative: weeklyNarrative(cursor, entries),
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
    tier: "Tier 2",
    startDate,
    endDate,
    deleted,
    createdEntries,
    createdSummaries,
    dobNote: "DOB was not visible in the supplied PDF; seeded as 01/01/1974 from prior approval."
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
