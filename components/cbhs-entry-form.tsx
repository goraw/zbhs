"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CBHSEntry, Client, User } from "@prisma/client";
import { Check, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { createLoggedEntry, getLoggedEntryForDate, updateLoggedEntry } from "@/lib/actions/entries";
import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";
import { cbhsEntrySchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormValues = z.infer<typeof cbhsEntrySchema>;
type EntryForForm = Pick<CBHSEntry, "id" | "clientId" | "date" | "servicePeriods" | "behaviorFrequencies" | "shift" | "shiftStaffId" | "firstShiftStaffId" | "secondShiftStaffId">;
type ExistingEntry = Awaited<ReturnType<typeof getLoggedEntryForDate>>;
type StaffUser = Pick<User, "id" | "name">;

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyFrequencies() {
  return Object.fromEntries(cbhsStandardLines.map((line) => [String(line.line), ""]));
}

function staffInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 3);
}

function findStaffId(staffUsers: StaffUser[], name: string) {
  const normalized = name.trim().toLowerCase();
  return staffUsers.find((staff) => staff.name.trim().toLowerCase() === normalized)?.id;
}

function uniqueStaffOptions(staffUsers: StaffUser[]) {
  const seen = new Set<string>();
  return staffUsers.filter((staff) => {
    const key = staff.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function defaultShiftStaffIds(staffUsers: StaffUser[], date: Date) {
  const dateValue = dateInputValue(date);
  const fallbackId = staffUsers[0]?.id ?? "";
  const fikiraddisId = findStaffId(staffUsers, "Fikiraddis Worku");
  const colletarId = findStaffId(staffUsers, "COLLETAR CHISANU");
  const kidistId = findStaffId(staffUsers, "Kidist Wolemicheal");
  const zillahId = findStaffId(staffUsers, "Zillah Jombee");

  if (dateValue >= "2024-12-23" && dateValue <= "2025-01-10") {
    return {
      firstShiftStaffId: colletarId ?? fallbackId,
      secondShiftStaffId: kidistId ?? fallbackId
    };
  }

  if (dateValue >= "2026-08-04" && dateValue <= "2026-08-10") {
    return {
      firstShiftStaffId: zillahId ?? fallbackId,
      secondShiftStaffId: kidistId ?? fallbackId
    };
  }

  return {
    firstShiftStaffId: fikiraddisId ?? fallbackId,
    secondShiftStaffId: date.getDay() === 3 ? kidistId ?? fallbackId : dateValue >= "2026-06-01" ? zillahId ?? fallbackId : colletarId ?? fallbackId
  };
}

function defaultShiftStaffId(staffUsers: StaffUser[], date: Date, shift: "FIRST" | "SECOND") {
  const defaults = defaultShiftStaffIds(staffUsers, date);
  return shift === "FIRST" ? defaults.firstShiftStaffId : defaults.secondShiftStaffId;
}

function defaultServicePeriods(shift: "FIRST" | "SECOND") {
  return shift === "FIRST" ? "6AM-6PM" : "6PM-6AM";
}

export function CBHSEntryForm({
  clients,
  staffName,
  staffUsers,
  entry
}: {
  clients: Client[];
  staffName: string;
  staffUsers: StaffUser[];
  entry?: EntryForForm;
}) {
  const selectableStaffUsers = useMemo(() => uniqueStaffOptions(staffUsers), [staffUsers]);
  const [detectedEntry, setDetectedEntry] = useState<ExistingEntry>(null);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [isCheckingExisting, startCheckingExisting] = useTransition();
  const behaviorFrequencies = {
    ...emptyFrequencies(),
    ...parseBehaviorFrequencies(entry?.behaviorFrequencies)
  };
  const initialShift = entry?.shift ?? "FIRST";
  const initialDate = entry?.date ?? new Date();

  const form = useForm<FormValues>({
    resolver: zodResolver(cbhsEntrySchema),
    defaultValues: {
      clientId: entry?.clientId ?? clients[0]?.id ?? "",
      shift: initialShift,
      shiftStaffId: entry?.shiftStaffId ?? defaultShiftStaffId(selectableStaffUsers, initialDate, initialShift),
      date: initialDate,
      servicePeriods: entry?.servicePeriods ?? defaultServicePeriods(initialShift),
      behaviorFrequencies
    }
  });

  const { control, register, handleSubmit, formState, setValue } = form;
  const selectedClientId = useWatch({ control, name: "clientId" });
  const selectedDate = useWatch({ control, name: "date" });
  const selectedShift = useWatch({ control, name: "shift" });
  const activeEntryId = detectedEntry?.id ?? entry?.id;
  const isUpdating = Boolean(activeEntryId);
  const isBusy = formState.isSubmitting || isCheckingExisting;
  const displayedInitials = staffInitials(staffName);

  useEffect(() => {
    if (entry || !selectedClientId || !selectedDate || !selectedShift) return;

    const dateValue = dateInputValue(selectedDate);
    startCheckingExisting(async () => {
      const existing = await getLoggedEntryForDate(selectedClientId, dateValue, selectedShift);
      setDetectedEntry(existing);

      if (existing) {
        const shiftStaffId = existing.shiftStaffId ?? defaultShiftStaffId(selectableStaffUsers, new Date(existing.date), selectedShift);
        setDuplicateWarning(`A ${selectedShift === "FIRST" ? "first" : "second"} shift log is already entered for this date. The saved data has been populated, and submitting will update that log.`);
        setValue("servicePeriods", existing.servicePeriods, { shouldDirty: false });
        setValue("shiftStaffId", shiftStaffId, { shouldDirty: false });
        setValue(
          "behaviorFrequencies",
          { ...emptyFrequencies(), ...parseBehaviorFrequencies(existing.behaviorFrequencies) },
          { shouldDirty: false }
        );
        return;
      }

      setDuplicateWarning("");
      setValue("shiftStaffId", defaultShiftStaffId(selectableStaffUsers, selectedDate, selectedShift), { shouldDirty: false });
      setValue("servicePeriods", defaultServicePeriods(selectedShift), { shouldDirty: false });
    });
  }, [entry, selectedClientId, selectedDate, selectedShift, setValue, selectableStaffUsers]);

  function populateEntry(existing: NonNullable<ExistingEntry>) {
    const shift = existing.shift ?? selectedShift;
    setValue("servicePeriods", existing.servicePeriods, { shouldDirty: false });
    setValue("shift", shift, { shouldDirty: false });
    setValue("shiftStaffId", existing.shiftStaffId ?? defaultShiftStaffId(selectableStaffUsers, new Date(existing.date), shift), { shouldDirty: false });
    setValue(
      "behaviorFrequencies",
      { ...emptyFrequencies(), ...parseBehaviorFrequencies(existing.behaviorFrequencies) },
      { shouldDirty: false }
    );
  }

  function resetDailyFields(date = selectedDate, shift = selectedShift) {
    setValue("servicePeriods", defaultServicePeriods(shift), { shouldDirty: false });
    setValue("shiftStaffId", defaultShiftStaffId(selectableStaffUsers, date, shift), { shouldDirty: false });
    setValue("behaviorFrequencies", emptyFrequencies(), { shouldDirty: false });
  }

  function handleEditDateChange(dateValue: string, onChange: (value: Date) => void) {
    if (!dateValue) return;

    const nextDate = new Date(`${dateValue}T00:00:00`);
    const nextDateValue = dateInputValue(nextDate);
    const originalDateValue = entry ? dateInputValue(entry.date) : "";

    if (!entry) {
      onChange(nextDate);
      startCheckingExisting(async () => {
        const existing = await getLoggedEntryForDate(selectedClientId, nextDateValue, selectedShift);
        setDetectedEntry(existing);

        if (existing) {
          setDuplicateWarning(`A ${selectedShift === "FIRST" ? "first" : "second"} shift log is already entered for this date. The saved data has been populated, and submitting will update that log.`);
          populateEntry(existing);
          return;
        }

        setDuplicateWarning("");
        resetDailyFields(nextDate);
      });
      return;
    }

    if (nextDateValue === originalDateValue) {
      onChange(nextDate);
      setDetectedEntry(null);
      setDuplicateWarning("");
      setValue("servicePeriods", entry.servicePeriods, { shouldDirty: false });
      setValue("shift", entry.shift ?? "FIRST", { shouldDirty: false });
      setValue("shiftStaffId", entry.shiftStaffId ?? defaultShiftStaffId(selectableStaffUsers, entry.date, entry.shift ?? "FIRST"), { shouldDirty: false });
      setValue("behaviorFrequencies", behaviorFrequencies, { shouldDirty: false });
      return;
    }

    const confirmed = window.confirm("Changing the date will reset the editable fields to the selected date. Continue?");
    if (!confirmed) return;

    onChange(nextDate);
    startCheckingExisting(async () => {
      const existing = await getLoggedEntryForDate(selectedClientId, nextDateValue, selectedShift);
      const isSameEntry = existing?.id === entry.id;
      setDetectedEntry(existing && !isSameEntry ? existing : null);

      if (existing) {
        if (!isSameEntry) {
          setDuplicateWarning(`A ${selectedShift === "FIRST" ? "first" : "second"} shift log is already entered for the selected date. The saved data has been populated, and submitting will update that log.`);
        } else {
          setDuplicateWarning("");
        }
        populateEntry(existing);
        return;
      }

      setDuplicateWarning("");
      resetDailyFields(nextDate, selectedShift);
    });
  }

  function handleShiftChange(shift: "FIRST" | "SECOND", onChange: (value: "FIRST" | "SECOND") => void) {
    onChange(shift);
    setDetectedEntry(null);
    setDuplicateWarning("");
    setValue("servicePeriods", defaultServicePeriods(shift), { shouldDirty: false });
    setValue("shiftStaffId", defaultShiftStaffId(selectableStaffUsers, selectedDate, shift), { shouldDirty: false });
  }

  async function onSubmit(values: FormValues) {
    if (activeEntryId) {
      await updateLoggedEntry(activeEntryId, values);
      return;
    }
    await createLoggedEntry(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-5 rounded-md border bg-white/95 p-5 shadow-lg shadow-primary/5">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="clientId">Client</Label>
          <Select id="clientId" {...register("clientId")}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Controller
            control={control}
            name="date"
            render={({ field }) => (
              <Input
                id="date"
                type="date"
                value={dateInputValue(field.value)}
                onBlur={field.onBlur}
                onChange={(event) => handleEditDateChange(event.target.value, field.onChange)}
              />
            )}
          />
        </div>
        <div><Label>Logged by</Label><Input value={staffName} readOnly /></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="shift">Shift</Label>
          <Controller
            control={control}
            name="shift"
            render={({ field }) => (
              <Select
                id="shift"
                value={field.value}
                onBlur={field.onBlur}
                onChange={(event) => handleShiftChange(event.target.value as "FIRST" | "SECOND", field.onChange)}
              >
                <option value="FIRST">First shift (6AM-6PM)</option>
                <option value="SECOND">Second shift (6PM-6AM)</option>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="shiftStaffId">Staff</Label>
          <Select id="shiftStaffId" {...register("shiftStaffId")}>
            {selectableStaffUsers.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
          </Select>
        </div>
      </div>

      {duplicateWarning ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-secondary/60 bg-secondary/15 p-3 text-sm text-foreground shadow-sm">
          <p>{duplicateWarning}</p>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground"
            aria-label="Dismiss duplicate log warning"
            onClick={() => setDuplicateWarning("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div className="rounded-md border bg-muted/60 p-4">
        <h2 className="text-sm font-semibold">Behaviors and Standard Interventions</h2>
        <div className="mt-3 grid gap-2">
          {cbhsStandardLines.map((line) => (
            <div key={line.line} className="grid gap-2 rounded-md border bg-white p-3 text-sm md:grid-cols-[3rem_1fr]">
              <div className="font-semibold">{line.line}:</div>
              <div><span className="font-medium">{line.behavior}</span> with {line.intervention}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.5fr]">
        <div>
          <Label htmlFor="servicePeriods">Time: list each service period</Label>
          <Textarea id="servicePeriods" {...register("servicePeriods")} placeholder="Example: 1PM-3PM, 5PM-7PM" />
        </div>
        <div>
          <Label>Daily behavior frequency and standard interventions</Label>
          <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {cbhsStandardLines.map((line) => (
              <label key={line.line} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
                <span className="font-medium">{line.line}:</span>
                <Input
                  className="mt-0 h-8"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  step="1"
                  {...register(`behaviorFrequencies.${line.line}`)}
                  aria-label={`Frequency for line ${line.line}`}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-primary/30 bg-muted p-4">
        <Label>Staff Initials</Label>
        <Input value={displayedInitials} readOnly />
        <p className="mt-2 text-sm text-muted-foreground">The logged-in user's initials are recorded with the current date and time when this entry is logged.</p>
      </div>

      {Object.keys(formState.errors).length ? <p className="text-sm text-destructive">Please complete all required fields before logging.</p> : null}
      <Button type="submit" className="w-fit" disabled={isBusy}>
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {formState.isSubmitting ? (isUpdating ? "Updating..." : "Logging...") : isUpdating ? "Update" : "Log"}
      </Button>
    </form>
  );
}
