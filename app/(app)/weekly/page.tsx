import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, Eye, Pencil, Search, Trash2, X } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { deleteWeeklySummary } from "@/lib/actions/weekly-summaries";
import { WeeklySummaryForm } from "@/components/weekly-summary-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const dynamic = "force-dynamic";
const pageSize = 20;

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

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function staffInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 3);
}

function pageNumber(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default async function WeeklyPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const user = await requireUser();
  const selectedClientId = searchParamValue(params.clientId);
  const from = searchParamValue(params.from);
  const to = searchParamValue(params.to);
  const page = pageNumber(searchParamValue(params.page));
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

  const [clients, summaryCount] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.weeklySummary.count({ where })
  ]);
  const totalPages = Math.max(1, Math.ceil(summaryCount / pageSize));
  const boundedPage = Math.min(page, totalPages);
  const summaries = await prisma.weeklySummary.findMany({
    where,
    include: { client: true, staff: true },
    orderBy: [{ weekStart: sort }, { createdAt: "desc" }],
    skip: (boundedPage - 1) * pageSize,
    take: pageSize
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Weekly CBHS Summary</h1>
        <p className="text-sm text-muted-foreground">Summarize daily support logs into a weekly supervision packet.</p>
      </div>

      <WeeklySummaryForm clients={clients} simpleMode={user.name === "Fikiraddis Worku"} />

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
                  href={weeklyQuery({ clientId: selectedClientId, from, to, sort: nextSort, page: "1" })}
                  aria-label={`Sort weekly summaries by week ${nextSort === "asc" ? "oldest first" : "newest first"}`}
                >
                  Week
                  <WeekSortIcon className="h-4 w-4" />
                </Link>
              </th>
              <th className="p-3">Client</th>
              <th className="p-3">Staff Initials</th>
              <th className="p-3">Report</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.id} className="border-t">
                <td className="p-3">{summary.weekStart.toLocaleDateString()} - {summary.weekEnd.toLocaleDateString()}</td>
                <td className="p-3 font-medium">{summary.client.name}</td>
                <td className="p-3">{staffInitials(summary.staff.name)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-3">
                    {summary.status === "SIGNED" ? (
                      <>
                      <Link className="inline-flex items-center gap-1 text-primary underline" href={`/api/reports/weekly/${summary.id}?preview=1`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Link>
                      <Link className="inline-flex items-center gap-1 text-primary underline" href={`/api/reports/weekly/${summary.id}`}>
                        <Download className="h-4 w-4" />
                        Download
                      </Link>
                      </>
                    ) : <span className="text-muted-foreground">Sign first</span>}
                    <Link className="inline-flex items-center gap-1 text-primary underline" href={`/logs?clientId=${summary.clientId}&from=${dateInputValue(summary.weekStart)}&to=${dateInputValue(summary.weekEnd)}`}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Link>
                    <form action={deleteWeeklySummary}>
                      <input type="hidden" name="summaryId" value={summary.id} />
                      <Button type="submit" size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </form>
                  </div>
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

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>Showing {summaries.length ? (boundedPage - 1) * pageSize + 1 : 0}-{Math.min(boundedPage * pageSize, summaryCount)} of {summaryCount} weekly summaries</p>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm" aria-disabled={boundedPage <= 1}>
            <Link href={weeklyQuery({ clientId: selectedClientId, from, to, sort, page: String(Math.max(1, boundedPage - 1)) })}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          </Button>
          <span>Page {boundedPage} of {totalPages}</span>
          <Button asChild variant="secondary" size="sm" aria-disabled={boundedPage >= totalPages}>
            <Link href={weeklyQuery({ clientId: selectedClientId, from, to, sort, page: String(Math.min(totalPages, boundedPage + 1)) })}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
