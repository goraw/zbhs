"use client";

import { useActionState, useEffect, useRef } from "react";
import { Clock3, Loader2, Plus, UserPlus } from "lucide-react";
import { addHrStaff, addWorkShift } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial = { ok: false, message: "" };

export function AddStaffForm() {
  const [state, action, pending] = useActionState(addHrStaff, initial);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return <details className="border-y py-4"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-primary"><UserPlus className="h-4 w-4" />Add staff</summary>
    <form ref={ref} action={action} className="mt-4 grid gap-4 md:grid-cols-2">
      <div><Label htmlFor="hr-name">Full name</Label><Input id="hr-name" name="name" required minLength={2} maxLength={100} disabled={pending} /></div>
      <div><Label htmlFor="hr-username">Username / email</Label><Input id="hr-username" name="username" required minLength={3} maxLength={100} autoComplete="off" disabled={pending} /></div>
      <div><Label htmlFor="hr-password">Initial password</Label><Input id="hr-password" name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" disabled={pending} /></div>
      <div className="flex items-end"><Button type="submit" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}{pending ? "Adding..." : "Add staff"}</Button></div>
      {state.message && <p role="status" className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{state.message}</p>}
    </form>
  </details>;
}

export function AddShiftForm() {
  const [state, action, pending] = useActionState(addWorkShift, initial);
  return <details className="border-y py-4"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-primary"><Plus className="h-4 w-4" />Add shift</summary>
    <form action={action} className="mt-4 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div><Label htmlFor="shift-name">Shift name</Label><Input id="shift-name" name="name" required minLength={2} maxLength={80} disabled={pending} /></div>
      <div><Label htmlFor="shift-start">From</Label><Input id="shift-start" name="start" type="time" required disabled={pending} /></div>
      <div><Label htmlFor="shift-end">To</Label><Input id="shift-end" name="end" type="time" required disabled={pending} /></div>
      <div><Label htmlFor="shift-minimum">Staff needed</Label><Input id="shift-minimum" name="minimumStaff" type="number" min={1} max={20} defaultValue={1} required disabled={pending} /></div>
      <Button type="submit" disabled={pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}{pending ? "Adding..." : "Add shift"}</Button>
      {state.message && <p role="status" className={(state.ok ? "text-primary" : "text-destructive") + " text-sm sm:col-span-2 lg:col-span-5"}>{state.message}</p>}
    </form>
  </details>;
}
