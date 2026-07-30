"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Client } from "@prisma/client";
import { Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createSignedEntry } from "@/lib/actions/entries";
import { cbhsStandardLines } from "@/lib/cbhs-standard-lines";
import { cbhsEntrySchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormValues = z.infer<typeof cbhsEntrySchema>;

export function CBHSEntryForm({ clients, staffName }: { clients: Client[]; staffName: string }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(cbhsEntrySchema),
    defaultValues: {
      clientId: clients[0]?.id ?? "",
      date: new Date(),
      servicePeriods: "",
      behaviorFrequencies: Object.fromEntries(cbhsStandardLines.map((line) => [String(line.line), ""])),
      summativeNote: "",
      signatureText: staffName,
      password: ""
    }
  });

  const { register, handleSubmit, formState } = form;

  async function onSubmit(values: FormValues) {
    await createSignedEntry(values);
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
          <Input id="date" type="date" {...register("date", { valueAsDate: true })} />
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
                  inputMode="numeric"
                  {...register(`behaviorFrequencies.${line.line}`)}
                  aria-label={`Frequency for line ${line.line}`}
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="summativeNote">Daily summative note</Label>
        <Textarea id="summativeNote" {...register("summativeNote")} placeholder="Briefly summarize caregiver observations and support provided for this service date." />
      </div>

      <div className="grid gap-4 rounded-md border border-primary/30 bg-muted p-4 md:grid-cols-2">
        <div>
          <Label htmlFor="signatureText">Typed signature</Label>
          <Input id="signatureText" {...register("signatureText")} />
        </div>
        <div>
          <Label htmlFor="password">Re-enter password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
        </div>
        <p className="text-sm text-muted-foreground md:col-span-2">Signing records the current date and time, locks the entry, and writes a compliance audit event.</p>
      </div>

      {Object.keys(formState.errors).length ? <p className="text-sm text-destructive">Please complete all required fields before signing.</p> : null}
      <Button type="submit" className="w-fit">
        <Lock className="h-4 w-4" />
        Sign and lock entry
      </Button>
    </form>
  );
}
