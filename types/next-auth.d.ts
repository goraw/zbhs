import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: "SUPER_ADMIN" | "STAFF";
    forcePasswordReset: boolean;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: "SUPER_ADMIN" | "STAFF";
      forcePasswordReset: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "SUPER_ADMIN" | "STAFF";
    forcePasswordReset: boolean;
  }
}
