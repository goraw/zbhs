import { PrismaClient, Role, BehaviorCategory } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cbhsStandardLines } from "../lib/cbhs-standard-lines";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.INITIAL_ADMIN_USERNAME ?? "admin";
  const existingSuperAdmins = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });

  if (existingSuperAdmins === 0) {
    await prisma.user.create({
      data: {
        name: process.env.INITIAL_ADMIN_NAME ?? "Primary Administrator",
        username,
        passwordHash: await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD ?? "ChangeMeNow!123", 12),
        role: Role.SUPER_ADMIN,
        forcePasswordReset: true
      }
    });
  }

  const client = await prisma.client.upsert({
    where: { clientId: "LOCAL-DEMO-001" },
    update: {},
    create: {
      name: "Demo Client",
      dob: new Date("1990-01-01"),
      clientId: "LOCAL-DEMO-001",
      authorizationTier: "CBHS Standard"
    }
  });

  for (const line of cbhsStandardLines) {
    const exists = await prisma.behavior.findFirst({ where: { clientRefId: client.id, name: line.behavior } });
    if (!exists) {
      await prisma.behavior.create({
        data: {
          clientRefId: client.id,
          name: line.behavior,
          category: BehaviorCategory.OTHER,
          description: line.behavior,
          defaultInterventions: line.intervention,
          severity: line.line
        }
      });
    }
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
