import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 15 * 60
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        const username = credentials?.username?.trim().toLowerCase();
        if (!username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        await audit("LOGIN", {
          userId: user.id,
          ipAddress: request?.headers?.["x-forwarded-for"]?.toString(),
          deviceIdentifier: request?.headers?.["user-agent"]?.toString(),
          details: "User authenticated with credentials provider."
        });

        return {
          id: user.id,
          name: user.name,
          email: user.username,
          role: user.role,
          forcePasswordReset: user.forcePasswordReset
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.forcePasswordReset = user.forcePasswordReset;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
        session.user.forcePasswordReset = Boolean(token.forcePasswordReset);
      }
      return session;
    }
  }
};
