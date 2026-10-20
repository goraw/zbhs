import { Trash2 } from "lucide-react";
import { removeShift } from "@/lib/actions/schedule";
import { Button } from "@/components/ui/button";
import { americanScheduleDate, shiftLabels, scheduleSource, type ScheduleRow } from "@/lib/schedule-report";

export function ScheduleTable({ rows, manage = false }: { rows: ScheduleRow[]; manage?: boolean }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm">
    <thead className="bg-muted"><tr>{["Date", "Staff", "Shift", "Source", "Client logs", "Clients", ...(manage ? ["Actions"] : [])].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.key} className="border-b">
      <td className="whitespace-nowrap p-3">{americanScheduleDate(row.date)}</td><td className="p-3 font-medium">{row.staffName}</td><td className="p-3">{shiftLabels[row.shift]}</td>
      <td className="p-3"><span className={row.manualAssignmentId ? "text-foreground" : "text-primary"}>{scheduleSource(row)}</span></td><td className="p-3 tabular-nums">{row.logCount}</td><td className="p-3 tabular-nums">{row.clientCount}</td>
      {manage && <td className="p-3">{row.manualAssignmentId ? <form action={removeShift}><input type="hidden" name="assignmentId" value={row.manualAssignmentId} /><Button type="submit" variant="secondary" size="sm" aria-label={`Remove manual assignment for ${row.staffName} on ${row.date}`} title="Remove manual assignment"><Trash2 className="h-4 w-4" /></Button></form> : <span className="text-muted-foreground">From logs</span>}</td>}
    </tr>)}{!rows.length && <tr><td colSpan={manage ? 7 : 6} className="p-8 text-center text-muted-foreground">No shifts match these filters.</td></tr>}</tbody>
  </table></div>;
}
