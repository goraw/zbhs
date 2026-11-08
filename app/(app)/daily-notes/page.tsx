import Link from "next/link";
import { ChevronLeft, ChevronRight, Pencil, Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonth, monthLabel, validMonth } from "@/lib/monthly-progress";
import { todayPacific } from "@/lib/daily-care";
import { adjacentMonth, daysInMonth } from "@/lib/daily-care-calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const dynamic = "force-dynamic";
export default async function DailyNotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const params = await searchParams;
  // Keep previously bookmarked month-range links working.
  const candidate = typeof params.month === "string" ? params.month : typeof params.from === "string" ? params.from.slice(0, 7) : "";
  const month = validMonth(candidate) ? candidate : currentMonth();
  const resident = typeof params.resident === "string" ? params.resident : "";
  const days = daysInMonth(month);
  const today = todayPacific();
  const residents = await prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  const notes = await prisma.dailyCareNote.findMany({ where: { deletedAt: null, ...(resident ? { clientId: resident } : {}), date: { gte: days[0], lte: days[days.length - 1] } }, select: { date: true, clientId: true, staff: { select: { name: true } } } });
  const byDay = new Map<string, { count: number; residents: Set<string>; staff: Set<string> }>();
  for (const note of notes) {
    const entry = byDay.get(note.date) ?? { count: 0, residents: new Set<string>(), staff: new Set<string>() };
    entry.count++; entry.residents.add(note.clientId); entry.staff.add(note.staff.name); byDay.set(note.date, entry);
  }
  const monthUrl = (value: string) => "/daily-notes?" + new URLSearchParams({ month: value, resident });
  const previous = adjacentMonth(month, -1);
  const next = adjacentMonth(month, 1);
  return <section className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Daily Care Notes</h1><p className="mt-1 text-sm text-muted-foreground">{monthLabel(month)}</p></div><Link href={"/monthly?month=" + month} className="text-sm font-medium text-primary underline">Monthly Progress Reports</Link></header>
    <form action="/daily-notes" className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_auto]"><div><Label htmlFor="filter-month">Month</Label><Input id="filter-month" name="month" type="month" defaultValue={month} required /></div><div><Label htmlFor="filter-resident">Resident</Label><Select id="filter-resident" name="resident" defaultValue={resident}><option value="">All residents</option>{residents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div><Button type="submit"><Search className="h-4 w-4" />Filter</Button></form>
    <nav aria-label="Month navigation" className="flex items-center justify-between gap-3"><div className="flex gap-2">{previous && <Button asChild variant="secondary" className="w-10 px-0"><Link href={monthUrl(previous)} title="Previous month" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Link></Button>}{next && <Button asChild variant="secondary" className="w-10 px-0"><Link href={monthUrl(next)} title="Next month" aria-label="Next month"><ChevronRight className="h-4 w-4" /></Link></Button>}</div><p className="text-sm text-muted-foreground">{notes.length} notes · {byDay.size} days documented</p></nav>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th scope="col" className="p-3">Day / Date</th><th scope="col" className="p-3">Notes</th><th scope="col" className="hidden p-3 sm:table-cell">Caregivers</th><th scope="col" className="p-3">Daily notes</th></tr></thead><tbody>{days.map((date) => {
      const summary = byDay.get(date);
      const future = date > today;
      const weekday = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long" });
      return <tr key={date} className={(date === today ? "bg-emerald-50/60 " : "") + "border-b"}><td className="p-3"><div className="font-medium">{weekday}</div><div className="mt-1 whitespace-nowrap text-xs text-muted-foreground">{date.slice(5, 7)}/{date.slice(8, 10)}/{date.slice(0, 4)}</div></td><td className="p-3 tabular-nums">{summary?.count ?? 0}</td><td className="hidden p-3 sm:table-cell">{summary ? [...summary.staff].join(", ") : "—"}</td><td className="p-3">{future ? <span className="text-muted-foreground">Upcoming</span> : <Link aria-label={(summary ? "Edit notes for " : "Add note for ") + date} href={"/daily-notes/" + date + "?" + new URLSearchParams({ resident })} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-primary underline"><Pencil className="h-4 w-4" />{summary ? "Edit" : "Add note"}</Link>}</td></tr>;
    })}</tbody></table></div>
  </section>;
}
