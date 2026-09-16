import { prisma } from "@/lib/prisma";

async function main() {
  const updated = await prisma.client.update({
    where: { clientId: "101663574WA" },
    data: { dob: new Date("1974-01-28T00:00:00.000Z") },
    select: { name: true, clientId: true, dob: true }
  });

  console.log(JSON.stringify(updated, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
