import { prisma } from "@/lib/prisma";
import { generatedSummaryNarrative } from "@/lib/weekly-summary-generator";

async function main() {
  const summaries = await prisma.weeklySummary.findMany({
    include: {
      client: { select: { id: true, name: true } }
    },
    orderBy: [{ clientId: "asc" }, { weekStart: "asc" }]
  });

  let updatedSummaries = 0;
  const updatedByClient = new Map<string, number>();

  for (const summary of summaries) {
    const entries = await prisma.cBHSEntry.findMany({
      where: {
        clientId: summary.clientId,
        date: { gte: summary.weekStart, lte: summary.weekEnd }
      },
      select: { date: true, behaviorFrequencies: true },
      orderBy: { date: "asc" }
    });

    if (!entries.length) continue;

    const nextNarrative = generatedSummaryNarrative(summary.client.name, summary.weekStart, entries);
    if (summary.narrative === nextNarrative) continue;

    await prisma.weeklySummary.update({
      where: { id: summary.id },
      data: { narrative: nextNarrative }
    });

    updatedSummaries += 1;
    updatedByClient.set(summary.client.name, (updatedByClient.get(summary.client.name) ?? 0) + 1);
  }

  console.log(JSON.stringify({
    scannedSummaries: summaries.length,
    updatedSummaries,
    updatedByClient: Object.fromEntries(updatedByClient)
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
