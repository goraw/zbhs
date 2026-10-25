"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Loader2, Trash2 } from "lucide-react";
import { removeWorkShift } from "@/lib/actions/schedule";
import { shiftTime, shiftHours, type WorkShiftData } from "@/lib/hr";
import { Button } from "@/components/ui/button";

export function HrShiftList({ shifts }: { shifts: WorkShiftData[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState({ ok: true, message: "" });
  return <div className="space-y-3">
    {notice.message && <p role="status" className={(notice.ok ? "text-primary" : "text-destructive") + " border-l-4 border-current px-3 py-2 text-sm"}>{notice.message}</p>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-muted"><tr>{["Shift", "Time", "Hours", "Staff needed", ""].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>
      {shifts.map((shift) => <tr key={shift.id} className="border-b"><td className="p-3 font-semibold"><span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" />{shift.name}</span></td><td className="whitespace-nowrap p-3">{shiftTime(shift)}</td><td className="p-3">{shiftHours(shift)}</td><td className="p-3">{shift.minimumStaff}</td><td className="p-3 text-right"><Button type="button" variant="secondary" size="sm" disabled={pending} title="Remove shift" onClick={() => startTransition(async () => {
        try { const result = await removeWorkShift(shift.id); setNotice(result); if (result.ok) router.refresh(); } catch { setNotice({ ok: false, message: "Unable to remove the shift. Please try again." }); }
      })}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Remove</Button></td></tr>)}
    </tbody></table></div>
  </div>;
}
