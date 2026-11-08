"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, X } from "lucide-react";
import { saveDailyCare, deleteDailyCare } from "@/lib/actions/daily-care";
import { todayPacific } from "@/lib/daily-care";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Note = { id: string; clientId: string; date: string; note: string; version: number };
export function DailyCareForm({ residents, initial, onClose, date, residentId }: { residents: { id: string; name: string }[]; initial?: Note; onClose?: (saved: boolean) => void; date?: string; residentId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  return <form onSubmit={(event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setNotice("");
    startTransition(async () => {
      try {
        const result = await saveDailyCare({ ...(initial ? { id: initial.id, version: initial.version } : {}), clientId: String(values.get("clientId") ?? ""), date: String(values.get("date") ?? ""), note: String(values.get("note") ?? "") });
        setNotice(result.message);
        if (result.ok) { if (!initial) form.reset(); onClose?.(true); router.refresh(); }
      } catch { setNotice("Unable to save. Please try again."); }
    });
  }} className="space-y-4 border-y py-5">
    {notice && <p role="status" className="rounded border bg-muted p-3 text-sm">{notice}</p>}
    <fieldset disabled={pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor={"resident-" + (initial?.id ?? "new")}>Resident</Label><Select id={"resident-" + (initial?.id ?? "new")} name={initial ? undefined : "clientId"} defaultValue={initial?.clientId ?? residentId} disabled={!!initial} required>{residents.map((resident) => <option key={resident.id} value={resident.id}>{resident.name}</option>)}</Select>{initial && <input type="hidden" name="clientId" value={initial.clientId} />}</div><div><Label htmlFor={"date-" + (initial?.id ?? "new")}>Date</Label><Input id={"date-" + (initial?.id ?? "new")} name="date" type="date" defaultValue={initial?.date ?? date ?? todayPacific()} readOnly={!!date} max={todayPacific()} required /></div></div>
      <div><Label htmlFor={"note-" + (initial?.id ?? "new")}>Daily care note</Label><Textarea id={"note-" + (initial?.id ?? "new")} name="note" rows={4} maxLength={10000} defaultValue={initial?.note} required /></div>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!residents.length || pending}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{pending ? "Saving..." : initial ? "Update note" : "Save note"}</Button>{onClose && <Button type="button" variant="secondary" onClick={() => onClose(false)}><X className="h-4 w-4" />Cancel</Button>}</div>
    </fieldset>
  </form>;
}

export function DailyCareNoteActions({ initial, residents, editOnOpen = false }: { initial: Note; residents: { id: string; name: string }[]; editOnOpen?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(editOnOpen);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  return <div className="mt-3 space-y-3">
    {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
    {editing ? <DailyCareForm key={initial.version} residents={residents} initial={initial} date={editOnOpen ? initial.date : undefined} onClose={(saved) => { setEditing(false); if (saved) setNotice("Daily note updated."); }} /> : <><p className="whitespace-pre-wrap break-words text-sm">{initial.note}</p><div className="mt-3 flex gap-2"><Button type="button" size="sm" variant="secondary" onClick={() => { setNotice(""); setEditing(true); }}>Edit</Button><Button type="button" size="sm" variant="secondary" onClick={() => setConfirming(true)}><Trash2 className="h-4 w-4" />Delete</Button></div></>}
    {confirming && <div className="flex flex-wrap items-center gap-3 border-l-4 border-red-600 bg-red-50 p-3 text-sm"><span>Delete this daily note?</span><Button type="button" size="sm" disabled={pending} onClick={() => startTransition(async () => {
      try { const result = await deleteDailyCare({ id: initial.id, version: initial.version }); setNotice(result.message); if (result.ok) { setConfirming(false); router.refresh(); } }
      catch { setNotice("Unable to delete. Please try again."); }
    })}>{pending ? "Deleting..." : "Delete note"}</Button><Button type="button" size="sm" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>Cancel</Button></div>}
  </div>;
}
