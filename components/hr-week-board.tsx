"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { changeShiftAssignment } from "@/lib/actions/schedule";
import { openShiftSlots, shiftTime, type WorkShiftData } from "@/lib/hr";
import type { ScheduleRow } from "@/lib/schedule-report";
import { Select } from "@/components/ui/select";

export function HrWeekBoard({ days, shifts, rows, staff, today }: {
  days: string[]; shifts: WorkShiftData[]; rows: ScheduleRow[]; staff: { id: string; name: string; isActive: boolean }[]; today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState({ ok: true, message: "" });
  const [mobileDay, setMobileDay] = useState(days.includes(today) ? today : days[0]);
  const activeRows = rows.filter((row) => row.staffActive);
  const open = openShiftSlots(days, shifts, activeRows);
  const urgent = open.filter((slot) => slot.date === today).reduce((sum, slot) => sum + slot.missing, 0);
  const missing = open.reduce((sum, slot) => sum + slot.missing, 0);
  const change = (staffId: string, date: string, workShiftId: string, intent: "assign" | "revoke") => startTransition(async () => {
    try { const result = await changeShiftAssignment({ staffId, date, workShiftId }, intent); setNotice(result); if (result.ok) router.refresh(); }
    catch { setNotice({ ok: false, message: "Unable to save the assignment. Please try again." }); }
  });
  const dayLabel = (date: string) => new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
  const slot = (date: string, shift: WorkShiftData) => {
    const assigned = rows.filter((row) => row.date === date && row.workShiftId === shift.id);
    const needed = Math.max(0, shift.minimumStaff - assigned.filter((row) => row.staffActive).length);
    return <div className="min-h-36 space-y-3 p-3">
      <div className={(needed ? "text-amber-800" : "text-emerald-800") + " flex items-center gap-1.5 text-xs font-semibold"}>{needed ? <><AlertCircle className="h-3.5 w-3.5" />{needed} open</> : <><CheckCircle2 className="h-3.5 w-3.5" />Covered</>}</div>
      <div className="space-y-2">{assigned.map((person) => <div key={person.key} className="flex items-center justify-between gap-1 rounded border bg-white px-2 py-1.5 text-xs"><span className={person.staffActive ? "font-medium" : "text-destructive"}>{person.staffName}{!person.staffActive && " (inactive)"}</span><button type="button" className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2" disabled={pending} title={"Revoke " + person.staffName} aria-label={"Revoke " + person.staffName + " from " + shift.name + " on " + date} onClick={() => change(person.staffId, date, shift.id, "revoke")}><X className="h-3.5 w-3.5" /></button></div>)}</div>
      <Select aria-label={"Assign " + shift.name + " on " + date} className="h-8 text-xs" value="" disabled={pending || !staff.some((person) => person.isActive)} onChange={(event) => { if (event.target.value) change(event.target.value, date, shift.id, "assign"); }}>
        <option value="">Assign staff...</option>{staff.filter((person) => person.isActive && !assigned.some((row) => row.staffId === person.id)).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
      </Select>
    </div>;
  };
  return <div className="space-y-4" aria-busy={pending}>
    {missing ? <div role="alert" className={(urgent ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900") + " flex items-start gap-3 rounded-md border p-4"}><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{urgent ? urgent + " open staff slots today" : missing + " open staff slots this week"}</p><p className="mt-1 text-sm">{urgent ? "Priority: assign today's coverage. " : ""}{missing} unassigned slots across {open.length} shifts.</p></div></div> : <div role="status" className="flex items-center gap-2 border-l-4 border-emerald-600 bg-emerald-50 p-3 text-sm font-medium text-emerald-900"><CheckCircle2 className="h-4 w-4" />All shifts covered this week</div>}
    {notice.message && <div role="status" className={(notice.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900") + " flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"}>{notice.message}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice({ ok: true, message: "" })}><X className="h-4 w-4" /></button></div>}
    {pending && <p role="status" className="flex items-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin" />Updating coverage...</p>}
    <div className="lg:hidden"><label htmlFor="board-day" className="mb-2 block text-sm font-semibold">Day</label><Select id="board-day" value={days.includes(mobileDay) ? mobileDay : days[0]} onChange={(event) => setMobileDay(event.target.value)}>{days.map((date) => <option key={date} value={date}>{dayLabel(date)}</option>)}</Select><div className="mt-4 divide-y border-y">{shifts.map((shift) => <section key={shift.id} className="py-3"><h3 className="px-3 font-semibold">{shift.name}</h3><p className="px-3 text-xs text-muted-foreground">{shiftTime(shift)}</p>{slot(days.includes(mobileDay) ? mobileDay : days[0], shift)}</section>)}</div></div>
    <div className="hidden overflow-x-auto rounded-md border bg-white lg:block"><table className="w-full min-w-[1040px] table-fixed text-left"><thead className="border-b bg-muted"><tr><th className="w-36 p-3 text-sm">Shift</th>{days.map((date) => <th key={date} className={(date === today ? "bg-primary/10 text-primary " : "") + "p-3 text-xs font-semibold"}>{dayLabel(date)}{date === today && <span className="mt-1 block">Today</span>}</th>)}</tr></thead><tbody>{shifts.map((shift) => <tr key={shift.id} className="border-b last:border-0"><th scope="row" className="p-3 align-top"><span className="text-sm font-semibold">{shift.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{shiftTime(shift)}</span><span className="mt-2 block text-xs font-normal text-muted-foreground">{shift.minimumStaff} staff needed</span></th>{days.map((date) => <td key={date} className={(date === today ? "bg-primary/[0.025] " : "") + "border-l align-top"}>{slot(date, shift)}</td>)}</tr>)}</tbody></table></div>
  </div>;
}
