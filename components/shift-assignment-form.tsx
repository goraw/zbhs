"use client";

import { useActionState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { assignShift } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function ShiftAssignmentForm({ staff, date }: { staff: { id: string; name: string }[]; date: string }) {
  const [state, action, pending] = useActionState(assignShift, { message: "", ok: false });
  return <form action={action} className="space-y-4 border-y py-5">
    <h2 className="text-lg font-semibold">Assign shift</h2>
    <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div><Label htmlFor="schedule-staff">Staff</Label><Select id="schedule-staff" name="staffId" required disabled={pending}><option value="">Select staff</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Select></div>
      <div><Label htmlFor="schedule-date">Date</Label><Input id="schedule-date" name="date" type="date" defaultValue={date} required disabled={pending} /></div>
      <div><Label htmlFor="schedule-shift">Shift</Label><Select id="schedule-shift" name="shift" disabled={pending}><option value="FIRST">First (6AM-2PM)</option><option value="SECOND">Second (4PM-10PM)</option><option value="THIRD">Third (10PM-6AM next day)</option></Select></div>
      <Button disabled={pending || !staff.length} type="submit">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}{pending ? "Assigning..." : "Assign shift"}</Button>
    </div>
    {state.message && <p role="status" className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>}
  </form>;
}
