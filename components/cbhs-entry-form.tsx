"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CBHSEntry, Client } from "@prisma/client";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createLoggedEntry, updateLoggedEntry } from "@/lib/actions/entries";
import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";
import { cbhsEntrySchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormValues = z.infer<typeof cbhsEntrySchema>;
type EntryForForm = Pick<CBHSEntry, "id" | "clientId" | "date" | "servicePeriods" | "behaviorFrequencies">;

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyFrequencies() {
  return Object.fromEntries(cbhsStandardLines.map((line) => [String(line.line), ""]));
}

export function CBHSEntryForm({
  clients,
  staffName,
  entry
}: {
  clients: Client[];
  staffName: string;
  entry?: EntryForForm;
}) {
  const behaviorFrequencies = {
    ...emptyFrequencies(),
    ...parseBehaviorFrequencies(entry?.behaviorFrequencies)
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(cbhsEntrySchema),
    defaultValues: {
      clientId: entry?.clientId ?? clients[0]?.id ?? "",
      date: entry?.date ?? new Date(),
      servicePeriods: entry?.servicePeriods ?? "7AM-9PM",
      behaviorFrequencies
    }
  });

  const { register, handleSubmit, formState } = form;

  async function onSubmit(values: FormValues) {
    if (entry) {
      await updateLoggedEntry(entry.id, values);
      return;
    }
    await createLoggedEntry(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-5 rounded-md border bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="clientId">Client</Label>
          <Select id="clientId" {...register("clientId")}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" defaultValue={dateInputValue(entry?.date ?? new Date())} {...register("date", { valueAsDate: true })} />
        </div>
        <div><Label>Staff</Label><Input value={staffName} readOnly /></div>
      </div>

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
                  min="0"
                  step="1"
                  pattern="[0-9]*"
                  {...register(`behaviorFrequencies.${line.line}`)}
                  aria-label={`Frequency for line ${line.line}`}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-primary/30 bg-muted p-4">
        <Label>Signature</Label>
        <Input value={staffName} readOnly />
        <p className="mt-2 text-sm text-muted-foreground">The logged-in user's name is recorded with the current date and time when this entry is logged.</p>
      </div>

      {Object.keys(formState.errors).length ? <p className="text-sm text-destructive">Please complete all required fields before logging.</p> : null}
      <Button type="submit" className="w-fit">
        <Check className="h-4 w-4" />
        Log
      </Button>
    </form>
  );
}
