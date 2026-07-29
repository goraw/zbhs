"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/security";
import { userSchema } from "@/lib/validation";

export async function createUser(formData: FormData) {
  const actor = await requireSuperAdmin();
  const data = userSchema.parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    if (data.role === "SUPER_ADMIN") {
      const count = await tx.user.count({ where: { role: "SUPER_ADMIN" } });
      if (count >= 1) throw new Error("Only one Super Admin account is permitted.");
    }

    const created = await tx.user.create({
      data: {
        name: data.name,
        username: data.username,
        role: data.role,
        passwordHash: await hashPassword(data.password),
        forcePasswordReset: true
      }
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "CREATE_USER",
        details: `Created ${created.role} user ${created.username}.`
      }
    });
  });

  revalidatePath("/admin/users");
}

export async function updateUserAccess(formData: FormData) {
  const actor = await requireSuperAdmin();
  const userId = String(formData.get("userId"));
  const intent = String(formData.get("intent"));
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("User not found.");

  const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (target.role === "SUPER_ADMIN" && (intent === "delete" || intent === "disable") && superAdminCount <= 1) {
    throw new Error("The primary Super Admin cannot be removed or disabled.");
  }

  if (intent === "delete") {
    await prisma.user.delete({ where: { id: userId } });
    await audit("DELETE_USER", { userId: actor.id, details: `Deleted user ${target.username}.` });
  } else {
    const data =
      intent === "enable" ? { isActive: true } :
      intent === "disable" ? { isActive: false } :
      { forcePasswordReset: true };

    await prisma.user.update({ where: { id: userId }, data });
    await audit("UPDATE_USER_ACCESS", { userId: actor.id, details: `${intent} for user ${target.username}.` });
  }

  revalidatePath("/admin/users");
}
