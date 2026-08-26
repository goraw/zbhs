"use client";

import Link from "next/link";
import type { CBHSEntry, Client, User } from "@prisma/client";
import { ArrowDown, ArrowUp, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { deleteLoggedEntry } from "@/lib/actions/entries";
import { Button } from "@/components/ui/button";
import { CBHSEntryForm } from "@/components/cbhs-entry-form";

type StaffUser = Pick<User, "id" | "name">;
type EntryForForm = Pick<CBHSEntry, "id" | "clientId" | "date" | "servicePeriods" | "behaviorFrequencies" | "shift" | "shiftStaffId" | "firstShiftStaffId" | "secondShiftStaffId">;

type LogEntry = EntryForForm & {
  client: Client;
  staff: Pick<User, "name">;
  shiftStaff: Pick<User, "name"> | null;
  firstShiftStaff: Pick<User, "name"> | null;
  secondShiftStaff: Pick<User, "name"> | null;
};

function logsQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const value = query.toString();
  return value ? `/logs?${value}` : "/logs";
}

function shiftStaffLabel(entry: LogEntry) {
  return entry.shiftStaff?.name ?? entry.firstShiftStaff?.name ?? entry.secondShiftStaff?.name ?? entry.staff.name;
}

function shiftLabel(shift: "FIRST" | "SECOND" | "THIRD") {
  if (shift === "FIRST") return "First shift";
  if (shift === "SECOND") return "Second shift";
  return "Third shift";
}

function formatAmericanDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function LogsTable({
  entries,
  clients,
  staffUsers,
  staffName,
  selectedClientId,
  selectedShift,
  from,
  to,
  sort
}: {
  entries: LogEntry[];
  clients: Client[];
  staffUsers: StaffUser[];
  staffName: string;
  selectedClientId: string;
  selectedShift: string;
  from: string;
  to: string;
  sort: "asc" | "desc";
}) {
  const router = useRouter();
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const nextSort = sort === "asc" ? "desc" : "asc";
  const DateSortIcon = sort === "asc" ? ArrowUp : ArrowDown;
  const editingEntry = useMemo(() => entries.find((entry) => entry.id === editingEntryId), [editingEntryId, entries]);

  function handleSaved(entry: LogEntry) {
    setEditingEntryId(null);
    setNotice(`${entry.client.name}'s ${shiftLabel(entry.shift).toLowerCase()} log was updated.`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {notice ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-foreground shadow-sm">
          <p>{notice}</p>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
            aria-label="Dismiss update notification"
            onClick={() => setNotice("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-md border bg-white/95 shadow-lg shadow-primary/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-md text-left font-semibold text-foreground transition-colors hover:text-primary"
                  href={logsQuery({ clientId: selectedClientId, shift: selectedShift, from, to, sort: nextSort })}
                  aria-label={`Sort logs by date ${nextSort === "asc" ? "oldest first" : "newest first"}`}
                >
                  Date
                  <DateSortIcon className="h-4 w-4" />
                </Link>
              </th>
              <th className="p-3">Client</th>
              <th className="p-3">Shift</th>
              <th className="p-3">Staff</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <Fragment key={entry.id}>
                <tr className="border-t transition-colors hover:bg-muted/50">
                  <td className="p-3">{formatAmericanDate(entry.date)}</td>
                  <td className="p-3 font-medium">{entry.client.name}</td>
                  <td className="p-3">{shiftLabel(entry.shift)}</td>
                  <td className="p-3">{shiftStaffLabel(entry)}</td>
                  <td className="p-3"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Logged</span></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={editingEntryId === entry.id ? "default" : "secondary"}
                        onClick={() => {
                          setNotice("");
                          setEditingEntryId((current) => current === entry.id ? null : entry.id);
                        }}
                        aria-expanded={editingEntryId === entry.id}
                      >
                        <Pencil className="h-4 w-4" />
                        {editingEntryId === entry.id ? "Close" : "Edit"}
                      </Button>
                      <form action={deleteLoggedEntry}>
                        <input type="hidden" name="entryId" value={entry.id} />
                        <Button type="submit" size="sm" variant="destructive"><Trash2 className="h-4 w-4" />Delete</Button>
                      </form>
                    </div>
                  </td>
                </tr>
                {editingEntry?.id === entry.id ? (
                  <tr className="border-t bg-muted/30">
                    <td colSpan={6} className="p-4">
                      <CBHSEntryForm
                        inline
                        clients={clients}
                        staffName={staffName}
                        staffUsers={staffUsers}
                        entry={entry}
                        onSaved={() => handleSaved(entry)}
                        onCancel={() => setEditingEntryId(null)}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
            {!entries.length ? (
              <tr className="border-t">
                <td className="p-6 text-center text-muted-foreground" colSpan={6}>No logs match the selected filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
