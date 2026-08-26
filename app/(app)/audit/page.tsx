import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
const pageSize = 50;

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function pageNumber(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function auditQuery(page: number) {
  return `/audit?page=${page}`;
}

export default async function AuditPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const page = pageNumber(searchParamValue(params.page));
  const logCount = await prisma.auditLog.count();
  const totalPages = Math.max(1, Math.ceil(logCount / pageSize));
  const boundedPage = Math.min(page, totalPages);
  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    orderBy: { timestamp: "desc" },
    skip: (boundedPage - 1) * pageSize,
    take: pageSize
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
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>Showing {logs.length ? (boundedPage - 1) * pageSize + 1 : 0}-{Math.min(boundedPage * pageSize, logCount)} of {logCount} audit events</p>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm" aria-disabled={boundedPage <= 1}>
            <Link href={auditQuery(Math.max(1, boundedPage - 1))}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          </Button>
          <span>Page {boundedPage} of {totalPages}</span>
          <Button asChild variant="secondary" size="sm" aria-disabled={boundedPage >= totalPages}>
            <Link href={auditQuery(Math.min(totalPages, boundedPage + 1))}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
