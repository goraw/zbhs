import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyUserPassword(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return false;
  return bcrypt.compare(password, user.passwordHash);
}

export function assertSqlCipherConfigured() {
  if (!process.env.SQLCIPHER_KEY) {
    console.warn("SQLCIPHER_KEY is not set. Use an encrypted local volume or SQLCipher-enabled SQLite build for PHI.");
  }
}
