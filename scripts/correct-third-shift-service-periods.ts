import { prisma } from "@/lib/prisma";

const thirdShiftServicePeriod = "4PM-5PM";

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function main() {
  const entries = await prisma.cBHSEntry.findMany({
    where: { shift: "THIRD" },
    include: { client: true },
    orderBy: [{ date: "asc" }, { clientId: "asc" }]
  });

  let updatedEntries = 0;
  const updatedByClient = new Map<string, number>();

  for (const entry of entries) {
    if (entry.servicePeriods === thirdShiftServicePeriod) continue;

    await prisma.cBHSEntry.update({
      where: { id: entry.id },
      data: { servicePeriods: thirdShiftServicePeriod }
    });

    updatedEntries += 1;
    updatedByClient.set(entry.client.name, (updatedByClient.get(entry.client.name) ?? 0) + 1);
  }

  console.log(JSON.stringify({
    scannedThirdShiftEntries: entries.length,
    updatedEntries,
    targetServicePeriod: thirdShiftServicePeriod,
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
