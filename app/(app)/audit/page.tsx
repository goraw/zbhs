import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { timestamp: "desc" },
    take: 200
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Append-only compliance activity for sensitive actions.</p>
      </div>
      <div className="overflow-hidden rounded-md border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr><th className="p-3">Time</th><th className="p-3">User</th><th className="p-3">Action</th><th className="p-3">Device</th><th className="p-3">Details</th></tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr className="border-t align-top" key={log.id}>
                <td className="p-3">{log.timestamp.toLocaleString()}</td>
                <td className="p-3">{log.user?.username ?? "system"}</td>
                <td className="p-3 font-medium">{log.action}</td>
                <td className="p-3">{log.ipAddress ?? "local"} / {log.deviceIdentifier ?? "unknown"}</td>
                <td className="max-w-xl p-3 text-muted-foreground">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
