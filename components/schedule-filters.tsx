import { Search, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { shiftLabels, type ScheduleFilters } from "@/lib/schedule-report";

export function ScheduleFiltersForm({ filters, staff, path, admin }: {
  filters: ScheduleFilters; staff: { id: string; name: string }[]; path: string; admin: boolean;
}) {
  return <form action={path} className="report-controls grid items-end gap-4 border-y py-4 sm:grid-cols-2 lg:grid-cols-5">
    <div><Label htmlFor="schedule-from">From</Label><Input id="schedule-from" name="from" type="date" defaultValue={filters.from} required /></div>
    <div><Label htmlFor="schedule-to">To</Label><Input id="schedule-to" name="to" type="date" defaultValue={filters.to} min={filters.from} required /></div>
    {admin && <div><Label htmlFor="filter-staff">Staff</Label><Select id="filter-staff" name="staffId" defaultValue={filters.staffId}><option value="">All staff</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Select></div>}
    <div><Label htmlFor="filter-shift">Shift</Label><Select id="filter-shift" name="shift" defaultValue={filters.shift}><option value="">All shifts</option>{Object.entries(shiftLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
    <div className="flex gap-2"><Button type="submit"><Search className="h-4 w-4" />Filter</Button><Button asChild variant="secondary"><Link href={path} aria-label="Reset filters" title="Reset filters"><X className="h-4 w-4" /></Link></Button></div>
  </form>;
}
