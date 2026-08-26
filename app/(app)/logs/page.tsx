import Link from "next/link";
import { Search, X } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { NavActionButton } from "@/components/nav-action-button";
import { LogsTable } from "@/components/logs-table";

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

export default async function LogsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const selectedClientId = searchParamValue(params.clientId);
  const selectedShift = searchParamValue(params.shift);
  const from = searchParamValue(params.from);
  const to = searchParamValue(params.to);
  const sort = searchParamValue(params.sort) === "asc" ? "asc" : "desc";
  const fromDate = dateBoundary(from);
  const toDate = dateBoundary(to, true);
  const where: Prisma.CBHSEntryWhereInput = {};

  if (selectedClientId) where.clientId = selectedClientId;
  if (selectedShift === "FIRST" || selectedShift === "SECOND" || selectedShift === "THIRD") {
    where.shift = selectedShift;
  }
  if (fromDate || toDate) {
    where.date = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: toDate } : {})
    };
  }

  const [user, clients, staffUsers, entries] = await Promise.all([
    getCurrentUser(),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { isActive: true, role: "STAFF" },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.cBHSEntry.findMany({
      where,
      select: {
        id: true,
        clientId: true,
        staffId: true,
        shiftStaffId: true,
        firstShiftStaffId: true,
        secondShiftStaffId: true,
        shift: true,
        date: true,
        startTime: true,
        endTime: true,
        durationMinutes: true,
        servicePeriods: true,
        behaviorFrequencies: true,
        triggers: true,
        staffInterventions: true,
        outcome: true,
        summativeNote: true,
        signatureText: true,
        signatureTimestamp: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        client: true,
        staff: { select: { name: true } },
        shiftStaff: { select: { name: true } },
        firstShiftStaff: { select: { name: true } },
        secondShiftStaff: { select: { name: true } }
      },
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

      <form action="/logs" className="grid gap-4 rounded-md border bg-white/95 p-4 shadow-lg shadow-primary/5 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto] md:items-end">
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
          <Label htmlFor="shift">Shift</Label>
          <Select id="shift" name="shift" defaultValue={selectedShift}>
            <option value="">All shifts</option>
            <option value="FIRST">First shift</option>
            <option value="SECOND">Second shift</option>
            <option value="THIRD">Third shift</option>
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

      <LogsTable
        entries={entries}
        clients={clients}
        staffUsers={staffUsers}
        staffName={user?.name ?? ""}
        selectedClientId={selectedClientId}
        selectedShift={selectedShift}
        from={from}
        to={to}
        sort={sort}
      />
    </section>
  );
}
