import { Trash2 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeShift } from "@/lib/actions/schedule";
import { ShiftAssignmentForm } from "@/components/shift-assignment-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";
const labels = { FIRST: "First (6AM-2PM)", SECOND: "Second (4PM-10PM)", THIRD: "Third (10PM-6AM next day)" };
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)); }

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const admin = user.role === "SUPER_ADMIN";
  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const from = typeof params.from === "string" && validDate(params.from) ? params.from : today;
  const end = new Date(`${from}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 30);
  const to = typeof params.to === "string" && validDate(params.to) && params.to >= from ? params.to : end.toISOString().slice(0, 10);
  const [staff, assignments] = await Promise.all([
    admin ? prisma.user.findMany({ where: { role: "STAFF", isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [],
    // Enforce schedule visibility on the server, independent of URL parameters.
    prisma.shiftAssignment.findMany({ where: { date: { gte: from, lte: to }, ...(!admin ? { staffId: user.id } : {}) }, include: { staff: { select: { name: true } } }, orderBy: [{ date: "asc" }, { shift: "asc" }], take: 500 })
  ]);
  return <section className="space-y-6">
    <h1 className="text-2xl font-semibold">{admin ? "Staff Schedule" : "My Schedule"}</h1>
    {admin && <ShiftAssignmentForm staff={staff} date={today} />}
    <form className="flex flex-wrap items-end gap-4"><div><Label htmlFor="from">From</Label><Input id="from" name="from" type="date" defaultValue={from} required /></div><div><Label htmlFor="to">To</Label><Input id="to" name="to" type="date" defaultValue={to} min={from} required /></div><Button type="submit" variant="secondary">Filter</Button></form>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr><th className="p-3">Date</th><th className="p-3">Staff</th><th className="p-3">Shift</th>{admin && <th className="p-3">Actions</th>}</tr></thead><tbody>{assignments.map((item) => <tr key={item.id} className="border-b"><td className="whitespace-nowrap p-3">{`${item.date.slice(5,7)}/${item.date.slice(8,10)}/${item.date.slice(0,4)}`}</td><td className="p-3">{item.staff.name}</td><td className="p-3">{labels[item.shift]}</td>{admin && <td className="p-3"><form action={removeShift}><input type="hidden" name="assignmentId" value={item.id} /><Button type="submit" variant="secondary" size="sm" aria-label={`Remove shift for ${item.staff.name} on ${item.date}`} title="Remove assignment"><Trash2 className="h-4 w-4" /></Button></form></td>}</tr>)}{!assignments.length && <tr><td colSpan={admin ? 4 : 3} className="p-8 text-center text-muted-foreground">No shifts assigned for these dates.</td></tr>}</tbody></table></div>
    {assignments.length === 500 && <p className="text-sm text-muted-foreground">Showing 500 assignments. Narrow the date range to see more.</p>}
  </section>;
}
