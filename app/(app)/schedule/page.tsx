import Link from "next/link";
import { AlertCircle, BarChart3, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStaffSchedule } from "@/lib/staff-schedule";
import { isScheduleDate, americanScheduleDate, scheduleQuery } from "@/lib/schedule-report";
import { coverageGaps, dayOffset, localToday, timeLabel, weekDays } from "@/lib/hr";
import { HrWeekBoard } from "@/components/hr-week-board";
import { AddStaffForm, AddShiftForm } from "@/components/hr-admin-forms";
import { HrShiftList } from "@/components/hr-shift-list";
import { ScheduleTable } from "@/components/schedule-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const admin = user.role === "SUPER_ADMIN";
  const params = await searchParams;
  const today = localToday();
  const selected = typeof params.week === "string" && isScheduleDate(params.week) ? params.week : today;
  const days = weekDays(selected);
  const tab = admin && (params.tab === "staff" || params.tab === "shifts") ? params.tab : "schedule";
  const filters = { from: days[0], to: days[6], staffId: "", shift: "" as const };
  const [staff, shifts, rows] = await Promise.all([
    admin ? prisma.user.findMany({ where: { role: "STAFF" }, select: { id: true, name: true, username: true, isActive: true }, orderBy: { name: "asc" } }) : [],
    prisma.workShift.findMany({ where: { isActive: true }, orderBy: { startMinute: "asc" } }),
    getStaffSchedule(user, filters)
  ]);
  const gaps = coverageGaps(shifts);
  const href = (week: string, value = tab) => "/schedule?" + new URLSearchParams({ week, tab: value });
  return <section className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">{admin ? "HR & Staffing" : "My Schedule"}</h1></div>
      {admin && <Button asChild variant="secondary"><Link href={"/reports?" + scheduleQuery(filters)}><BarChart3 className="h-4 w-4" />Staff report</Link></Button>}
    </div>
    {admin && <nav aria-label="HR sections" className="flex gap-6 border-b">{[["schedule", "Schedule", CalendarDays], ["staff", "Staff", Users], ["shifts", "Shifts", Clock3]].map(([value, label, Icon]) => {
      const TabIcon = Icon as typeof Users;
      return <Link key={value as string} href={href(days[0], value as typeof tab)} aria-current={tab === value ? "page" : undefined} className={(tab === value ? "border-primary text-primary" : "border-transparent text-muted-foreground") + " inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold"}><TabIcon className="h-4 w-4" />{label as string}{value === "staff" && <span className="text-xs tabular-nums">{staff.filter((person) => person.isActive).length}</span>}</Link>;
    })}</nav>}
    {tab === "schedule" && <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Button asChild variant="secondary" size="sm"><Link href={href(dayOffset(days[0], -7))} aria-label="Previous week" title="Previous week"><ChevronLeft className="h-4 w-4" /></Link></Button><h2 className="text-sm font-semibold">{americanScheduleDate(days[0])} - {americanScheduleDate(days[6])}</h2><Button asChild variant="secondary" size="sm"><Link href={href(dayOffset(days[0], 7))} aria-label="Next week" title="Next week"><ChevronRight className="h-4 w-4" /></Link></Button><Button asChild variant="secondary" size="sm"><Link href={href(today)}>This week</Link></Button></div>
        <form action="/schedule" className="flex items-center gap-2"><label htmlFor="schedule-week" className="text-sm font-medium">Week of</label><Input id="schedule-week" name="week" type="date" defaultValue={selected} className="w-40" /><Button type="submit" size="sm">Go</Button></form>
      </div>
      {gaps.length > 0 && <div role="alert" className="flex gap-2 border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-900"><AlertCircle className="h-5 w-5 shrink-0" />Shift coverage gap: {gaps.map((gap) => timeLabel(gap.start) + "-" + timeLabel(gap.end)).join(", ")}{admin && <Link href={href(days[0], "shifts")} className="font-semibold underline">Manage shifts</Link>}</div>}
      {admin ? <HrWeekBoard key={days[0]} days={days} shifts={shifts} rows={rows} staff={staff} today={today} /> : <ScheduleTable rows={rows} />}
    </>}
    {tab === "staff" && <>
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Staff Directory</h2><Link href="/admin/users" className="text-sm font-medium text-primary underline">Manage account access</Link></div>
      <AddStaffForm />
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Staff</th><th className="p-3">Username / email</th><th className="p-3">Status</th></tr></thead><tbody>{staff.map((person) => <tr key={person.id} className="border-b"><td className="p-3 font-medium">{person.name}</td><td className="p-3">{person.username}</td><td className="p-3"><span className={person.isActive ? "text-emerald-800" : "text-muted-foreground"}>{person.isActive ? "Active" : "Inactive"}</span></td></tr>)}{!staff.length && <tr><td colSpan={3} className="p-8 text-center text-muted-foreground">No staff added yet.</td></tr>}</tbody></table></div>
    </>}
    {tab === "shifts" && <>
      <h2 className="text-lg font-semibold">Shift Coverage</h2>
      {gaps.length ? <div role="alert" className="flex items-center gap-2 border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-900"><AlertCircle className="h-5 w-5" />Uncovered: {gaps.map((gap) => timeLabel(gap.start) + "-" + timeLabel(gap.end)).join(", ")}</div> : <div className="flex items-center gap-2 border-l-4 border-emerald-600 bg-emerald-50 p-4 text-sm font-medium text-emerald-900"><CheckCircle2 className="h-5 w-5" />24-hour shift coverage complete</div>}
      <AddShiftForm /><HrShiftList shifts={shifts} />
    </>}
  </section>;
}
