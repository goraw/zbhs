"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function signOutAction() {
  const user = await getCurrentUser();
  if (user) {
    await audit("LOGOUT", { userId: user.id, details: "User initiated logout." });
  }
  redirect("/api/auth/signout?callbackUrl=/login");
}
