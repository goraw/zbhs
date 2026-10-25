import { americanScheduleDate, type ScheduleRow } from "@/lib/schedule-report";
import { shiftHours, shiftTime } from "@/lib/hr";

export function ScheduleTable({ rows }: { rows: ScheduleRow[] }) {
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm">
    <thead className="bg-muted"><tr>{["Date", "Staff", "Shift", "Time", "Scheduled hours"].map((heading) => <th key={heading} scope="col" className="p-3">{heading}</th>)}</tr></thead>
    <tbody>{rows.map((row) => <tr key={row.key} className="border-b">
      <td className="whitespace-nowrap p-3">{americanScheduleDate(row.date)}</td><td className="p-3 font-medium">{row.staffName}</td><td className="p-3">{row.shiftName}</td><td className="whitespace-nowrap p-3">{shiftTime(row)}</td><td className="p-3 tabular-nums">{shiftHours(row)}</td>
    </tr>)}{!rows.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No shifts match these dates.</td></tr>}</tbody>
  </table></div>;
}
