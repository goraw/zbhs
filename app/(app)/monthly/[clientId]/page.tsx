import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonth, monthLabel, monthlyContentSchema, validMonth } from "@/lib/monthly-progress";
import { MonthlyProgressForm } from "@/components/monthly-progress-form";

export const dynamic = "force-dynamic";

export default async function ResidentMonthlyPage({ params, searchParams }: { params: Promise<{ clientId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const { clientId } = await params;
  const query = await searchParams;
  const month = typeof query.month === "string" && validMonth(query.month) ? query.month : currentMonth();
  const [client, report] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } }),
    prisma.monthlyProgress.findUnique({ where: { clientId_month: { clientId, month } }, include: { revisions: { orderBy: { version: "desc" }, take: 50, select: { id: true, version: true, authorName: true, status: true, reason: true, createdAt: true } } } })
  ]);
  if (!client) notFound();
  return <section className="space-y-5">
    <Link href={"/monthly?month=" + month} className="inline-flex items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" />Monthly overview</Link>
    <div><h1 className="text-2xl font-semibold">Monthly Resident Progress Report</h1><p className="mt-1 text-base font-medium">{client.name} <span className="font-normal text-muted-foreground">| {monthLabel(month)}</span></p></div>
    <MonthlyProgressForm key={clientId + month} clientId={clientId} month={month} caregiver={user.name ?? ""} report={report ? { id: report.id, version: report.version, status: report.status, authorName: report.authorName, completedAt: report.completedAt?.toISOString() ?? null, content: monthlyContentSchema.parse(JSON.parse(report.content)) } : null} />
    {report && <details className="border-t pt-4"><summary className="cursor-pointer font-semibold">Revision history ({report.revisions.length})</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr>{["Version", "Caregiver", "Status", "Reason", "Date", ""].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead><tbody>{report.revisions.map((revision) => <tr key={revision.id} className="border-b"><td className="p-3">{revision.version}</td><td className="p-3">{revision.authorName}</td><td className="p-3">{revision.status === "COMPLETED" ? "Completed" : "Draft"}</td><td className="max-w-md whitespace-pre-wrap break-words p-3">{revision.reason}</td><td className="whitespace-nowrap p-3">{revision.createdAt.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })}</td><td className="p-3"><Link className="inline-flex items-center gap-1 text-primary underline" target="_blank" rel="noopener noreferrer" prefetch={false} href={"/api/reports/monthly/" + clientId + "?month=" + month + "&preview=1&revision=" + revision.version}><Eye className="h-4 w-4" />Preview</Link></td></tr>)}</tbody></table></div></details>}
  </section>;
}
