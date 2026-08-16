import Link from "next/link";
import { FileText, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { WeeklySummaryForm } from "@/components/weekly-summary-form";

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  const [clients, summaries] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.weeklySummary.findMany({
      include: { client: true, staff: true },
      orderBy: { weekStart: "desc" },
      take: 50
    })
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Weekly CBHS Summary</h1>
        <p className="text-sm text-muted-foreground">Summarize daily support logs into a weekly supervision packet.</p>
      </div>

      <WeeklySummaryForm clients={clients} />

      <div className="overflow-hidden rounded-md border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr><th className="p-3">Week</th><th className="p-3">Client</th><th className="p-3">Staff</th><th className="p-3">Status</th><th className="p-3">PDF</th></tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.id} className="border-t">
                <td className="p-3">{summary.weekStart.toLocaleDateString()} - {summary.weekEnd.toLocaleDateString()}</td>
                <td className="p-3 font-medium">{summary.client.name}</td>
                <td className="p-3">{summary.staff.name}</td>
                <td className="p-3">{summary.status === "SIGNED" ? <span className="inline-flex items-center gap-1 text-primary"><Lock className="h-4 w-4" />Signed</span> : "Draft"}</td>
                <td className="p-3">{summary.status === "SIGNED" ? <Link className="inline-flex items-center gap-1 text-primary underline" href={`/api/reports/weekly/${summary.id}`}><FileText className="h-4 w-4" />Weekly PDF</Link> : "Sign first"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
