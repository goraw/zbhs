"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Behavior, Client } from "@prisma/client";
import { Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createSignedEntry } from "@/lib/actions/entries";
import { cbhsEntrySchema } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FormValues = z.infer<typeof cbhsEntrySchema>;

export function CBHSEntryForm({ clients, behaviors, staffName }: { clients: Client[]; behaviors: Behavior[]; staffName: string }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(cbhsEntrySchema),
    defaultValues: {
      clientId: clients[0]?.id ?? "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      behaviorIds: [],
      triggers: "",
      staffInterventions: "",
      outcome: "",
      summativeNote: "",
      signatureText: staffName,
      password: ""
    }
  });

  const { register, handleSubmit, setValue, watch, formState } = form;
  const selectedBehaviors = watch("behaviorIds");

  async function onSubmit(values: FormValues) {
    await createSignedEntry(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-5 rounded-md border bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <Label htmlFor="clientId">Client</Label>
          <Select id="clientId" {...register("clientId")}>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</Select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date", { valueAsDate: true })} />
        </div>
        <div>
          <Label htmlFor="startTime">Start</Label>
          <Input id="startTime" type="time" {...register("startTime")} />
        </div>
        <div>
          <Label htmlFor="endTime">End</Label>
          <Input id="endTime" type="time" {...register("endTime")} />
        </div>
      </div>

      <div>
        <Label>Target behaviors</Label>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {behaviors.map((behavior) => (
            <label key={behavior.id} className="flex items-start gap-3 rounded-md border p-3 text-sm">
              <Checkbox
                checked={selectedBehaviors.includes(behavior.id)}
                onCheckedChange={(checked) => {
                  setValue(
                    "behaviorIds",
                    checked ? [...selectedBehaviors, behavior.id] : selectedBehaviors.filter((id) => id !== behavior.id),
                    { shouldValidate: true }
                  );
                }}
              />
              <span><span className="font-medium">{behavior.name}</span><br /><span className="text-muted-foreground">{behavior.defaultInterventions}</span></span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div><Label htmlFor="triggers">Antecedent / triggers</Label><Textarea id="triggers" {...register("triggers")} /></div>
        <div><Label htmlFor="staffInterventions">Staff interventions</Label><Textarea id="staffInterventions" {...register("staffInterventions")} /></div>
        <div><Label htmlFor="outcome">Outcome / baseline status</Label><Textarea id="outcome" {...register("outcome")} /></div>
        <div><Label htmlFor="summativeNote">Daily summative note</Label><Textarea id="summativeNote" {...register("summativeNote")} /></div>
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
