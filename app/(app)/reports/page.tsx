import Link from "next/link";
import { Download } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStaffSchedule } from "@/lib/staff-schedule";
import { americanScheduleDate, scheduleFilters, summarizeSchedule } from "@/lib/schedule-report";
import { ScheduleFiltersForm } from "@/components/schedule-filters";
import { ScheduleTable } from "@/components/schedule-table";
import { PrintStaffReport } from "@/components/print-staff-report";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function StaffReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireSuperAdmin();
  const params = await searchParams;
  let filters;
  let error = "";
  try { filters = scheduleFilters(params); } catch (cause) {
    error = cause instanceof Error ? cause.message : "Choose a valid date range.";
    filters = scheduleFilters({});
  }
  const [staff, rows] = await Promise.all([
    prisma.user.findMany({ where: { role: "STAFF" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    error ? [] : getStaffSchedule(user, filters)
  ]);
  const summary = summarizeSchedule(rows);
  const query = new URLSearchParams(filters);
  return <section className="staff-report space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Staff Schedule Report</h1><p className="mt-1 text-sm text-muted-foreground">Zagol Seniors Care · {americanScheduleDate(filters.from)} - {americanScheduleDate(filters.to)}</p></div>
      {!error && <div className="report-controls flex flex-wrap gap-2"><Button asChild><Link href={`/api/reports/staff?${query}`} prefetch={false}><Download className="h-4 w-4" />Export CSV</Link></Button><PrintStaffReport /></div>}
    </div>
    <ScheduleFiltersForm filters={filters} staff={staff} path="/reports" admin />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <dl className="grid grid-cols-2 gap-4 border-b pb-5 md:grid-cols-4">{[
      ["Staff", summary.length], ["Shifts", rows.length], ["Shifts with logs", rows.filter((row) => row.logCount > 0).length], ["Client logs", rows.reduce((sum, row) => sum + row.logCount, 0)]
    ].map(([label, value]) => <div key={label}><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd></div>)}</dl>
    <section className="space-y-3"><h2 className="text-lg font-semibold">By Staff</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr>{["Staff", "Days", "First shift", "Second shift", "Third shift", "Total shifts", "Client logs"].map((label) => <th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead><tbody>{summary.map((person) => <tr key={person.staffId} className="border-b"><td className="p-3 font-medium">{person.name}</td>{[person.days, person.first, person.second, person.third, person.shifts, person.logs].map((count, index) => <td key={index} className="p-3 tabular-nums">{count}</td>)}</tr>)}{!summary.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No staff activity matches these filters.</td></tr>}</tbody></table></div></section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Shift Details</h2><ScheduleTable rows={rows} /></section>
  </section>;
}
