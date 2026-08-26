"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CBHSEntry, Client, User } from "@prisma/client";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { createLoggedEntry, getLoggedEntryForDate, updateLoggedEntry, updateLoggedEntryInline } from "@/lib/actions/entries";
import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";
import { cbhsEntrySchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type FormValues = z.infer<typeof cbhsEntrySchema>;
type EntryForForm = Pick<CBHSEntry, "id" | "clientId" | "date" | "servicePeriods" | "behaviorFrequencies" | "shift" | "shiftStaffId" | "firstShiftStaffId" | "secondShiftStaffId">;
type ExistingEntry = Awaited<ReturnType<typeof getLoggedEntryForDate>>;
type StaffUser = Pick<User, "id" | "name">;
type Shift = "FIRST" | "SECOND" | "THIRD";
type ServicePeriod = { from: string; to: string };

const timeOptions = [
  "6AM", "6:30AM", "7AM", "7:30AM", "8AM", "8:30AM", "9AM", "9:30AM", "10AM", "10:30AM", "11AM", "11:30AM",
  "12PM", "12:30PM", "1PM", "1:30PM", "2PM", "2:30PM", "3PM", "3:30PM", "4PM", "4:30PM", "5PM", "5:30PM", "6PM", "6:30PM", "7PM",
  "7:30PM", "8PM", "8:30PM", "9PM", "9:30PM", "10PM", "10:30PM", "11PM", "11:30PM", "12AM", "12:30AM", "1AM", "1:30AM", "2AM",
  "2:30AM", "3AM", "3:30AM", "4AM", "4:30AM", "5AM", "5:30AM"
];

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyFrequencies() {
  return Object.fromEntries(cbhsStandardLines.map((line) => [String(line.line), ""]));
}

function timeToMinutes(value: string) {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (hours === 12) hours = 0;
  return (match[3] === "PM" ? hours + 12 : hours) * 60 + minutes;
}

function shiftRelativeMinutes(value: string, shift: Shift) {
  const minutes = timeToMinutes(value);
  if (shift !== "THIRD") return minutes;
  return minutes < 6 * 60 ? minutes + 24 * 60 : minutes;
}

function isEndOptionDisabled(from: string, to: string, shift: Shift) {
  const start = shiftRelativeMinutes(from, shift);
  const end = shiftRelativeMinutes(to, shift);
  if (end <= start) return true;
  if (shift === "FIRST") return start < 6 * 60 || end > 14 * 60;
  if (shift === "SECOND") return start < 16 * 60 || end > 22 * 60;
  return start < 22 * 60 || end > 30 * 60;
}

function periodToText(period: ServicePeriod) {
  return `${period.from}-${period.to}`;
}

function parseServicePeriods(value: string): ServicePeriod[] {
  const parsed = value
    .split(/[\n,;]+/)
    .map((period) => period.trim())
    .filter(Boolean)
    .map((period) => {
      const [from, to] = period.split(/\s*-\s*/);
      return from && to ? { from, to } : null;
    })
    .filter((period): period is ServicePeriod => Boolean(period));
  return parsed.length ? parsed : [{ from: "6:30AM", to: "7:30AM" }];
}

function serializeServicePeriods(periods: ServicePeriod[]) {
  return periods.map(periodToText).join(", ");
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
  const abyotId = findStaffId(staffUsers, "Abyot Seid");
  const colletarId = findStaffId(staffUsers, "COLLETAR CHISANU");
  const kidistId = findStaffId(staffUsers, "Kidist Wolemicheal");
  const zillahId = findStaffId(staffUsers, "Zillah Jombee");

  if (dateValue >= "2024-12-23" && dateValue <= "2025-01-10") {
    return {
      firstShiftStaffId: kidistId ?? fallbackId,
      secondShiftStaffId: colletarId ?? fallbackId
    };
  }

  if (dateValue >= "2026-08-04" && dateValue <= "2026-08-10") {
    return {
      firstShiftStaffId: kidistId ?? fallbackId,
      secondShiftStaffId: zillahId ?? fallbackId
    };
  }

  return {
    firstShiftStaffId: fikiraddisId ?? fallbackId,
    secondShiftStaffId: dateValue >= "2026-05-01" ? abyotId ?? fallbackId : date.getDay() === 3 ? colletarId ?? fallbackId : kidistId ?? fallbackId
  };
}

function defaultShiftStaffId(staffUsers: StaffUser[], date: Date, shift: Shift) {
  const defaults = defaultShiftStaffIds(staffUsers, date);
  if (shift === "FIRST") return defaults.firstShiftStaffId;
  if (shift === "SECOND") return defaults.secondShiftStaffId;
  return dateInputValue(date) >= "2026-05-01"
    ? findStaffId(staffUsers, "Zillah Jombee") ?? defaults.secondShiftStaffId
    : findStaffId(staffUsers, "COLLETAR CHISANU") ?? defaults.secondShiftStaffId;
}

function defaultServicePeriods(shift: Shift) {
  if (shift === "FIRST") return "6:30AM-7:30AM, 12PM-1PM";
  if (shift === "SECOND") return "6PM-7PM";
  return "10PM-11PM";
}

function shiftName(shift: Shift) {
  if (shift === "FIRST") return "first";
  if (shift === "SECOND") return "second";
  return "third";
}

export function CBHSEntryForm({
  clients,
  staffName,
  staffUsers,
  entry,
  inline = false,
  onSaved,
  onCancel
}: {
  clients: Client[];
  staffName: string;
  staffUsers: StaffUser[];
  entry?: EntryForForm;
  inline?: boolean;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const selectableStaffUsers = useMemo(() => uniqueStaffOptions(staffUsers), [staffUsers]);
  const [detectedEntry, setDetectedEntry] = useState<ExistingEntry>(null);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [isCheckingExisting, startCheckingExisting] = useTransition();
  const behaviorFrequencies = {
    ...emptyFrequencies(),
    ...parseBehaviorFrequencies(entry?.behaviorFrequencies)
  };
  const initialShift = (entry?.shift ?? "FIRST") as Shift;
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
  const selectedShiftStaffId = useWatch({ control, name: "shiftStaffId" });
  const activeEntryId = detectedEntry?.id ?? entry?.id;
  const isUpdating = Boolean(activeEntryId);
  const isBusy = formState.isSubmitting || isCheckingExisting;
  const selectedShiftStaffName = selectableStaffUsers.find((staff) => staff.id === selectedShiftStaffId)?.name ?? staffName;
  const displayedInitials = staffInitials(selectedShiftStaffName);
  const selectedClientName = clients.find((client) => client.id === selectedClientId)?.name ?? "";

  useEffect(() => {
    if (entry || !selectedClientId || !selectedDate || !selectedShift) return;

    const dateValue = dateInputValue(selectedDate);
    startCheckingExisting(async () => {
      const existing = await getLoggedEntryForDate(selectedClientId, dateValue, selectedShift);
      setDetectedEntry(existing);

      if (existing) {
        const shiftStaffId = existing.shiftStaffId ?? defaultShiftStaffId(selectableStaffUsers, new Date(existing.date), selectedShift);
        setDuplicateWarning(`A ${shiftName(selectedShift)} shift log is already entered for this date. The saved data has been populated, and submitting will update that log.`);
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
          setDuplicateWarning(`A ${shiftName(selectedShift)} shift log is already entered for this date. The saved data has been populated, and submitting will update that log.`);
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
      const entryShift = (entry.shift ?? "FIRST") as Shift;
      setValue("shift", entryShift, { shouldDirty: false });
      setValue("shiftStaffId", entry.shiftStaffId ?? defaultShiftStaffId(selectableStaffUsers, entry.date, entryShift), { shouldDirty: false });
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
          setDuplicateWarning(`A ${shiftName(selectedShift)} shift log is already entered for the selected date. The saved data has been populated, and submitting will update that log.`);
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

  function handleShiftChange(shift: Shift, onChange: (value: Shift) => void) {
    onChange(shift);
    setDetectedEntry(null);
    setDuplicateWarning("");
    setValue("servicePeriods", defaultServicePeriods(shift), { shouldDirty: false });
    setValue("shiftStaffId", defaultShiftStaffId(selectableStaffUsers, selectedDate, shift), { shouldDirty: false });
  }

  function updateServicePeriods(periods: ServicePeriod[]) {
    setValue("servicePeriods", serializeServicePeriods(periods), { shouldDirty: true, shouldValidate: true });
  }

  async function onSubmit(values: FormValues) {
    if (activeEntryId) {
      if (inline) {
        await updateLoggedEntryInline(activeEntryId, values);
        onSaved?.();
        return;
      }
      await updateLoggedEntry(activeEntryId, values);
      return;
    }
    await createLoggedEntry(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`${inline ? "mt-0" : "mt-6"} grid gap-5 rounded-md border bg-white/95 p-5 shadow-lg shadow-primary/5`}>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="clientId">Client</Label>
          {entry ? (
            <>
              <Input id="clientId" value={selectedClientName} readOnly />
              <input type="hidden" {...register("clientId")} />
            </>
          ) : (
            <Select id="clientId" {...register("clientId")}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select>
          )}
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
                onChange={(event) => handleShiftChange(event.target.value as Shift, field.onChange)}
              >
                <option value="FIRST">First shift (6AM-2PM)</option>
                <option value="SECOND">Second shift (4PM-10PM)</option>
                <option value="THIRD">Third shift (10PM-6AM)</option>
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
          <Controller
            control={control}
            name="servicePeriods"
            render={({ field }) => {
              const periods = parseServicePeriods(field.value);
              return (
                <div className="mt-1 grid gap-3 rounded-md border bg-white p-3">
                  {periods.map((period, index) => (
                    <div key={`${period.from}-${period.to}-${index}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                      <div>
                        <Label htmlFor={`period-from-${index}`} className="text-xs">From</Label>
                        <Select
                          id={`period-from-${index}`}
                          value={period.from}
                          onChange={(event) => {
                            const next = periods.map((item, itemIndex) => itemIndex === index ? { ...item, from: event.target.value } : item);
                            field.onChange(serializeServicePeriods(next));
                          }}
                        >
                          {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`period-to-${index}`} className="text-xs">To</Label>
                        <Select
                          id={`period-to-${index}`}
                          value={period.to}
                          onChange={(event) => {
                            const next = periods.map((item, itemIndex) => itemIndex === index ? { ...item, to: event.target.value } : item);
                            field.onChange(serializeServicePeriods(next));
                          }}
                        >
                          {timeOptions.map((time) => <option key={time} value={time} disabled={isEndOptionDisabled(period.from, time, selectedShift)}>{time}</option>)}
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        aria-label={`Remove service period ${index + 1}`}
                        onClick={() => {
                          const next = periods.filter((_, itemIndex) => itemIndex !== index);
                          field.onChange(serializeServicePeriods(next.length ? next : [period]));
                        }}
                        disabled={periods.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-fit"
                    onClick={() => {
                      const last = periods[periods.length - 1] ?? { from: "6:30AM", to: "7:30AM" };
                      const nextFrom = last.to;
                      const nextTo = timeOptions.find((time) => timeToMinutes(time) > timeToMinutes(nextFrom)) ?? nextFrom;
                      updateServicePeriods([...periods, { from: nextFrom, to: nextTo }]);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add period
                  </Button>
                  {formState.errors.servicePeriods?.message ? (
                    <p className="text-sm text-destructive">{formState.errors.servicePeriods.message}</p>
                  ) : null}
                </div>
              );
            }}
          />
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
        <p className="mt-2 text-sm text-muted-foreground">The selected staff member's initials are recorded with the current date and time when this entry is logged.</p>
      </div>

      {Object.keys(formState.errors).length ? <p className="text-sm text-destructive">Please complete all required fields before logging.</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="w-fit" disabled={isBusy}>
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {formState.isSubmitting ? (isUpdating ? "Updating..." : "Logging...") : isUpdating ? "Update" : "Log"}
        </Button>
        {inline && onCancel ? (
          <Button type="button" variant="secondary" className="w-fit" disabled={isBusy} onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
