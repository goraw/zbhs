import Link from "next/link";
import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validEventDate } from "@/lib/monthly-progress";
import { DailyCareForm, DailyCareNoteActions } from "@/components/daily-care-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export const dynamic = "force-dynamic";
export default async function DailyNotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const params = await searchParams;
  const resident = typeof params.resident === "string" ? params.resident : "";
  const from = typeof params.from === "string" && validEventDate(params.from) ? params.from : "";
  const to = typeof params.to === "string" && validEventDate(params.to) ? params.to : "";
  const requested = Math.min(100000, Math.max(1, Number(params.page) || 1));
  const where = { deletedAt: null, ...(resident ? { clientId: resident } : {}), ...((from || to) ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) };
  const [residents, count] = await Promise.all([prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }), prisma.dailyCareNote.count({ where })]);
  const pages = Math.max(1, Math.ceil(count / 20));
  const page = Math.min(pages, Math.floor(requested));
  const notes = await prisma.dailyCareNote.findMany({ where, include: { client: { select: { name: true } }, staff: { select: { name: true } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20 });
  const pageUrl = (value: number) => "/daily-notes?" + new URLSearchParams({ resident, from, to, page: String(value) });
  return <section className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Daily Care Notes</h1><Link href="/monthly" className="text-sm font-medium text-primary underline">Monthly Progress Reports</Link></header>
    <DailyCareForm residents={residents} />
    <form action="/daily-notes" className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4"><div><Label htmlFor="filter-resident">Resident</Label><Select id="filter-resident" name="resident" defaultValue={resident}><option value="">All residents</option>{residents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></div><div><Label htmlFor="filter-from">From</Label><Input id="filter-from" name="from" type="date" defaultValue={from} /></div><div><Label htmlFor="filter-to">To</Label><Input id="filter-to" name="to" type="date" defaultValue={to} /></div><Button type="submit"><Search className="h-4 w-4" />Filter</Button></form>
    <div className="divide-y border-y">{notes.map((note) => <article key={note.id} className="py-5"><header className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{note.client.name}</h2><p className="text-sm text-muted-foreground">{note.date.slice(5, 7)}/{note.date.slice(8, 10)}/{note.date.slice(0, 4)} · {note.staff.name}</p></header><p className="mt-3 whitespace-pre-wrap break-words text-sm">{note.note}</p>{(note.staffId === user.id || user.role === "SUPER_ADMIN") && <DailyCareNoteActions initial={{ id: note.id, clientId: note.clientId, date: note.date, note: note.note, version: note.version }} residents={residents} />}</article>)}{!notes.length && <p className="py-8 text-sm text-muted-foreground">No daily care notes for these filters.</p>}</div>
    <nav aria-label="Daily notes pagination" className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{count} notes · Page {page} of {pages}</span><div className="flex gap-2">{page > 1 && <Button asChild variant="secondary"><Link href={pageUrl(page - 1)}>Previous</Link></Button>}{page < pages && <Button asChild variant="secondary"><Link href={pageUrl(page + 1)}>Next</Link></Button>}</div></nav>
  </section>;
}
