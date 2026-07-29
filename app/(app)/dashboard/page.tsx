import { Lock, Users, BookOpen, FileText, type LucideIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [clients, behaviors, signedEntries, auditLogs] = await Promise.all([
    prisma.client.count(),
    prisma.behavior.count(),
    prisma.cBHSEntry.count({ where: { status: "SIGNED" } }),
    prisma.auditLog.count()
  ]);

  const stats: Array<[string, number, LucideIcon]> = [
    ["Clients", clients, Users],
    ["Behaviors", behaviors, BookOpen],
    ["Signed Logs", signedEntries, Lock],
    ["Audit Events", auditLogs, FileText]
  ];

  return (
    <section>
      <h1 className="text-2xl font-semibold">Clinical Operations</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, Icon]) => (
          <div key={label} className="rounded-md border bg-white p-5 shadow-sm">
            <Icon className="h-5 w-5 text-primary" />
            <div className="mt-3 text-3xl font-semibold">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
