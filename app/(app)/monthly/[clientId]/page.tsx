import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
    prisma.monthlyProgress.findUnique({ where: { clientId_month: { clientId, month } } })
  ]);
  if (!client) notFound();
  return <section className="space-y-5">
    <Link href={"/monthly?month=" + month} className="inline-flex items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" />Monthly overview</Link>
    <div><h1 className="text-2xl font-semibold">Monthly Resident Progress Report</h1><p className="mt-1 text-base font-medium">{client.name} <span className="font-normal text-muted-foreground">| {monthLabel(month)}</span></p></div>
    <MonthlyProgressForm key={clientId + month} clientId={clientId} month={month} caregiver={user.name ?? ""} report={report ? { id: report.id, version: report.version, status: report.status, authorName: report.authorName, completedAt: report.completedAt?.toISOString() ?? null, content: monthlyContentSchema.parse(JSON.parse(report.content)) } : null} />
  </section>;
}
