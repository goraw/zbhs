import Link from "next/link";
import { ArrowDown, ArrowUp, Search, X, Pencil, Trash2 } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { deleteLoggedEntry } from "@/lib/actions/entries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { NavActionButton } from "@/components/nav-action-button";

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

function logsQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const value = query.toString();
  return value ? `/logs?${value}` : "/logs";
}

function shiftStaffLabel(entry: {
  staff: { name: string };
  shiftStaff: { name: string } | null;
  firstShiftStaff: { name: string } | null;
  secondShiftStaff: { name: string } | null;
}) {
  return entry.shiftStaff?.name ?? entry.firstShiftStaff?.name ?? entry.secondShiftStaff?.name ?? entry.staff.name;
}

function shiftLabel(shift: "FIRST" | "SECOND") {
  return shift === "FIRST" ? "First shift" : "Second shift";
}

export default async function LogsPage({
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
  const DateSortIcon = sort === "asc" ? ArrowUp : ArrowDown;
  const fromDate = dateBoundary(from);
  const toDate = dateBoundary(to, true);
  const where: Prisma.CBHSEntryWhereInput = {};

  if (selectedClientId) where.clientId = selectedClientId;
  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {})
    };
  }

  const [clients, entries] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.cBHSEntry.findMany({
      where,
      include: { client: true, staff: true, shiftStaff: true, firstShiftStaff: true, secondShiftStaff: true },
      orderBy: [{ date: sort }, { shift: "asc" }]
    })
  ]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CBHS Logs</h1>
          <p className="text-sm text-muted-foreground">Daily entries feed the weekly CBHS report; PDFs are generated from signed weekly summaries.</p>
        </div>
        <NavActionButton href="/logs/new" label="New log" pendingLabel="Opening log..." />
      </div>

      <form action="/logs" className="grid gap-4 rounded-md border bg-white/95 p-4 shadow-lg shadow-primary/5 md:grid-cols-[1.2fr_1fr_1fr_auto_auto] md:items-end">
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
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from} />
        </div>
        <div>
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to} />
        </div>
        <Button type="submit">
          <Search className="h-4 w-4" />
          Filter
        </Button>
        <Button asChild variant="secondary">
          <Link href="/logs"><X className="h-4 w-4" />Clear</Link>
        </Button>
        <input type="hidden" name="sort" value={sort} />
      </form>

      <div className="overflow-hidden rounded-md border bg-white/95 shadow-lg shadow-primary/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-md text-left font-semibold text-foreground transition-colors hover:text-primary"
                  href={logsQuery({ clientId: selectedClientId, from, to, sort: nextSort })}
                  aria-label={`Sort logs by date ${nextSort === "asc" ? "oldest first" : "newest first"}`}
                >
                  Date
                  <DateSortIcon className="h-4 w-4" />
                </Link>
              </th>
              <th className="p-3">Client</th>
              <th className="p-3">Shift</th>
              <th className="p-3">Staff</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr className="border-t transition-colors hover:bg-muted/50" key={entry.id}>
                <td className="p-3">{entry.date.toLocaleDateString()}</td>
                <td className="p-3 font-medium">{entry.client.name}</td>
                <td className="p-3">{shiftLabel(entry.shift)}</td>
                <td className="p-3">{shiftStaffLabel(entry)}</td>
                <td className="p-3"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Logged</span></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="secondary">
                      <Link href={`/logs/${entry.id}/edit`}><Pencil className="h-4 w-4" />Edit</Link>
                    </Button>
                    <form action={deleteLoggedEntry}>
                      <input type="hidden" name="entryId" value={entry.id} />
                      <Button type="submit" size="sm" variant="destructive"><Trash2 className="h-4 w-4" />Delete</Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!entries.length ? (
              <tr className="border-t">
                <td className="p-6 text-center text-muted-foreground" colSpan={6}>No logs match the selected filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
