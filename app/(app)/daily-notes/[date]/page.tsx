import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validEventDate } from "@/lib/monthly-progress";
import { todayPacific } from "@/lib/daily-care";
import { DailyCareForm, DailyCareNoteActions } from "@/components/daily-care-form";

export const dynamic = "force-dynamic";
export default async function DailyCareDayPage({ params, searchParams }: { params: Promise<{ date: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const { date } = await params;
  if (!validEventDate(date)) notFound();
  const query = await searchParams;
  const resident = typeof query.resident === "string" ? query.resident : "";
  const residents = await prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  if (resident && !residents.some((item) => item.id === resident)) notFound();
  const notes = await prisma.dailyCareNote.findMany({ where: { date, deletedAt: null, ...(resident ? { clientId: resident } : {}) }, include: { client: { select: { name: true } }, staff: { select: { name: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const future = date > todayPacific();
  return <section className="space-y-6">
    <Link href={"/daily-notes?" + new URLSearchParams({ month: date.slice(0, 7), resident })} className="inline-flex items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="h-4 w-4" />Back to monthly notes</Link>
    <header><h1 className="text-2xl font-semibold">Daily Care Notes</h1><p className="mt-1 text-muted-foreground">{new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" })}{resident ? " · " + residents.find((item) => item.id === resident)?.name : ""}</p></header>
    <div className="divide-y">{notes.map((note) => <article key={note.id} className="py-4"><header className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{note.client.name}</h2><span className="text-sm text-muted-foreground">{note.staff.name}</span></header>{!future && (note.staffId === user.id || user.role === "SUPER_ADMIN") ? <DailyCareNoteActions initial={{ id: note.id, clientId: note.clientId, date, note: note.note, version: note.version }} residents={residents} editOnOpen /> : <p className="mt-3 whitespace-pre-wrap break-words text-sm">{note.note}</p>}</article>)}</div>
    {future ? <p className="text-sm text-muted-foreground">Notes cannot be entered for a future date.</p> : <section><h2 className="text-lg font-semibold">{notes.length ? "Add another note" : "Add daily note"}</h2><DailyCareForm residents={resident ? residents.filter((item) => item.id === resident) : residents} date={date} residentId={resident || undefined} /></section>}
  </section>;
}
