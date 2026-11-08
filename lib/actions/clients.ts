"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { nextResidentId } from "@/lib/resident-id";
import { clientSchema } from "@/lib/validation";

export async function createClient(formData: FormData) {
  const user = await requireUser();
  const data = clientSchema.parse(Object.fromEntries(formData));

  // Allocate and audit atomically; retry concurrent allocations, never accept an ID from the browser.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.client.findMany({ select: { clientId: true } });
        const clientId = nextResidentId(existing.map((resident) => resident.clientId));
        const resident = await tx.client.create({ data: { ...data, clientId } });
        await tx.auditLog.create({ data: { userId: user.id, action: "CREATE_CLIENT", details: `Created resident ${resident.clientId}.` } });
      });
      break;
    } catch (error) {
      if (attempt < 4 && error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034", "P1008"].includes(error.code)) continue;
      throw error;
    }
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
}
