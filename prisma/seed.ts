import { PrismaClient, Role, BehaviorCategory } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  const behaviors = [
    ["Verbal aggression", BehaviorCategory.AGGRESSIVE, "Raised voice, threats, or hostile verbalizations.", "Use calm voice, offer choices, redirect to coping skill.", 3],
    ["Self-harm statements", BehaviorCategory.SELF_HARM_RISK, "Statements indicating intent or ideation for self-harm.", "Initiate safety protocol, maintain line-of-sight, notify supervisor.", 5],
    ["Boundary intrusion", BehaviorCategory.INTRUSIVE, "Repeated interruptions or entering peer space.", "Prompt boundaries, reinforce replacement behavior, provide structured activity.", 2]
  ] as const;

  for (const [name, category, description, defaultInterventions, severity] of behaviors) {
    const exists = await prisma.behavior.findFirst({ where: { clientRefId: client.id, name } });
    if (!exists) {
      await prisma.behavior.create({
        data: { clientRefId: client.id, name, category, description, defaultInterventions, severity }
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
