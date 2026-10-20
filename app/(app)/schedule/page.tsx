import Link from "next/link";
import { BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStaffSchedule } from "@/lib/staff-schedule";
import { scheduleFilters } from "@/lib/schedule-report";
import { ShiftAssignmentForm } from "@/components/shift-assignment-form";
import { ScheduleFiltersForm } from "@/components/schedule-filters";
import { ScheduleTable } from "@/components/schedule-table";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
const pageSize = 50;

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const admin = user.role === "SUPER_ADMIN";
  const params = await searchParams;
  let filters;
  let error = "";
  try { filters = scheduleFilters(params); } catch (cause) {
    error = cause instanceof Error ? cause.message : "Choose a valid date range.";
    filters = scheduleFilters({});
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [staff, rows] = await Promise.all([
    admin ? prisma.user.findMany({ where: { role: "STAFF" }, select: { id: true, name: true, isActive: true }, orderBy: { name: "asc" } }) : [],
    error ? [] : getStaffSchedule(user, filters)
  ]);
  const requestedPage = Number(params.page);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, totalPages);
  const displayed = rows.slice((page - 1) * pageSize, page * pageSize);
  const pageUrl = (value: number) => "/schedule?" + new URLSearchParams({ ...filters, page: String(value) });
  return <section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">{admin ? "Staff Schedule" : "My Schedule"}</h1>
      {admin && <Button asChild variant="secondary"><Link href={"/reports?" + new URLSearchParams(filters)}><BarChart3 className="h-4 w-4" />Staff report</Link></Button>}
    </div>
    {admin && <ShiftAssignmentForm staff={staff.filter((person) => person.isActive)} date={today} />}
    <ScheduleFiltersForm filters={filters} staff={staff} path="/schedule" admin={admin} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <ScheduleTable rows={displayed} manage={admin} />
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>{rows.length} shifts · Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        {page > 1 && <Button asChild variant="secondary" size="sm"><Link href={pageUrl(page - 1)}><ChevronLeft className="h-4 w-4" />Previous</Link></Button>}
        {page < totalPages && <Button asChild variant="secondary" size="sm"><Link href={pageUrl(page + 1)}>Next<ChevronRight className="h-4 w-4" /></Link></Button>}
      </div>
    </div>
  </section>;
}
