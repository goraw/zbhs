"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { behaviorSchema } from "@/lib/validation";

export async function upsertBehavior(formData: FormData) {
  const user = await requireUser();
  const data = behaviorSchema.parse(Object.fromEntries(formData));

  const behavior = await prisma.behavior.create({ data });
  await audit("CREATE_BEHAVIOR", { userId: user.id, details: `Created behavior ${behavior.name}.` });

  revalidatePath("/behaviors");
  revalidatePath("/dashboard");
}
