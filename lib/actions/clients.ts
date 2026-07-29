"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { clientSchema } from "@/lib/validation";

export async function createClient(formData: FormData) {
  const user = await requireUser();
  const data = clientSchema.parse(Object.fromEntries(formData));

  const client = await prisma.client.create({ data });
  await audit("CREATE_CLIENT", { userId: user.id, details: `Created client ${client.clientId}.` });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
}
