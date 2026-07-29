import Link from "next/link";
import { Lock, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const entries = await prisma.cBHSEntry.findMany({
    include: { client: true, staff: true },
    orderBy: { date: "desc" }
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CBHS Logs</h1>
          <p className="text-sm text-muted-foreground">Daily entries feed the weekly CBHS report; PDFs are generated from signed weekly summaries.</p>
        </div>
        <Button asChild><Link href="/logs/new"><Plus className="h-4 w-4" />New log</Link></Button>
      </div>
      <div className="overflow-hidden rounded-md border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr><th className="p-3">Date</th><th className="p-3">Client</th><th className="p-3">Staff</th><th className="p-3">Status</th><th className="p-3">Use</th></tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-t" key={entry.id}>
                <td className="p-3">{entry.date.toLocaleDateString()}</td>
                <td className="p-3 font-medium">{entry.client.name}</td>
                <td className="p-3">{entry.staff.name}</td>
                <td className="p-3">{entry.status === "SIGNED" ? <span className="inline-flex items-center gap-1 text-primary"><Lock className="h-4 w-4" />Signed</span> : "Draft"}</td>
                <td className="p-3">{entry.status === "SIGNED" ? "Weekly report source" : "Draft source"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
