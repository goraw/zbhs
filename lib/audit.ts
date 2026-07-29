import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: string | null;
  request?: NextRequest;
  ipAddress?: string | null;
  deviceIdentifier?: string | null;
  details: string;
};

export async function audit(action: string, input: AuditInput) {
  const ipAddress = input.ipAddress ?? input.request?.headers.get("x-forwarded-for") ?? input.request?.headers.get("x-real-ip");
  const deviceIdentifier = input.deviceIdentifier ?? input.request?.headers.get("user-agent");

  // Audit rows are only created through this helper and there is no update/delete UI.
  // For stronger tamper evidence in production, place the SQLite file on encrypted media and back it up append-only.
  await prisma.auditLog.create({
    data: {
      action,
      userId: input.userId,
      details: input.details,
      ipAddress,
      deviceIdentifier
    }
  });
}
