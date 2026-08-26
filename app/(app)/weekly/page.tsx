import Link from "next/link";
import { ArrowDown, ArrowUp, Download, Eye, Search, X } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WeeklySummaryForm } from "@/components/weekly-summary-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const dynamic = "force-dynamic";

function searchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function dateBoundary(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function weeklyQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const value = query.toString();
  return value ? `/weekly?${value}` : "/weekly";
}

export default async function WeeklyPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const selectedClientId = searchParamValue(params.clientId);
  const from = searchParamValue(params.from);
  const to = searchParamValue(params.to);
  const sort = searchParamValue(params.sort) === "asc" ? "asc" : "desc";
  const nextSort = sort === "asc" ? "desc" : "asc";
  const WeekSortIcon = sort === "asc" ? ArrowUp : ArrowDown;
  const fromDate = dateBoundary(from);
  const toDate = dateBoundary(to, true);
  const where: Prisma.WeeklySummaryWhereInput = {};

  if (selectedClientId) where.clientId = selectedClientId;
  if (fromDate || toDate) {
    where.weekStart = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {})
    };
  }

  const [clients, summaries] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.weeklySummary.findMany({
      where,
      include: { client: true, staff: true },
      orderBy: { weekStart: sort },
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

      <form action="/weekly" className="grid gap-4 rounded-md border bg-white/95 p-4 shadow-lg shadow-primary/5 md:grid-cols-[1.2fr_1fr_1fr_auto_auto] md:items-end">
        <div>
          <Label htmlFor="clientId">Client</Label>
          <Select id="clientId" name="clientId" defaultValue={selectedClientId}>
            <option value="">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="from">From week</Label>
          <Input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div>
          <Label htmlFor="to">To week</Label>
          <Input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <Button type="submit">
          <Search className="h-4 w-4" />
          Filter
        </Button>
        <Button asChild variant="secondary">
          <Link href="/weekly"><X className="h-4 w-4" />Clear</Link>
        </Button>
        <input type="hidden" name="sort" value={sort} />
      </form>

      <div className="overflow-hidden rounded-md border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-md text-left font-semibold text-foreground transition-colors hover:text-primary"
                  href={weeklyQuery({ clientId: selectedClientId, from, to, sort: nextSort })}
                  aria-label={`Sort weekly summaries by week ${nextSort === "asc" ? "oldest first" : "newest first"}`}
                >
                  Week
                  <WeekSortIcon className="h-4 w-4" />
                </Link>
              </th>
              <th className="p-3">Client</th>
              <th className="p-3">Staff</th>
              <th className="p-3">Report</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.id} className="border-t">
                <td className="p-3">{summary.weekStart.toLocaleDateString()} - {summary.weekEnd.toLocaleDateString()}</td>
                <td className="p-3 font-medium">{summary.client.name}</td>
                <td className="p-3">{summary.staff.name}</td>
                <td className="p-3">
                  {summary.status === "SIGNED" ? (
                    <div className="flex flex-wrap gap-3">
                      <Link className="inline-flex items-center gap-1 text-primary underline" href={`/api/reports/weekly/${summary.id}?preview=1`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Link>
                      <Link className="inline-flex items-center gap-1 text-primary underline" href={`/api/reports/weekly/${summary.id}`}>
                        <Download className="h-4 w-4" />
                        Download
                      </Link>
                    </div>
                  ) : "Sign first"}
                </td>
              </tr>
            ))}
            {!summaries.length ? (
              <tr className="border-t">
                <td className="p-6 text-center text-muted-foreground" colSpan={4}>No weekly summaries match the selected filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
