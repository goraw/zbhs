"use client";

import type { Client } from "@prisma/client";
import { FilePenLine, Loader2, Lock, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { generateWeeklySummary, saveWeeklySummary } from "@/lib/actions/weekly-summaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function SubmitButtons() {
  const { pending } = useFormStatus();

  return (
    <div className="flex items-end gap-2">
      <Button type="submit" variant="secondary" name="intent" value="draft" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePenLine className="h-4 w-4" />}
        {pending ? "Saving..." : "💾 Save draft"}
      </Button>
      <Button type="submit" name="intent" value="sign" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {pending ? "Signing..." : "🔒 Sign and PDF"}
      </Button>
    </div>
  );
}

export function WeeklySummaryForm({ clients }: { clients: Client[] }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState("");
  const [narrative, setNarrative] = useState("");
  const [message, setMessage] = useState("");
  const [isGenerating, startGenerating] = useTransition();

  function handleGenerate() {
    if (!clientId || !weekStart) {
      setMessage("Choose a client and week first.");
      return;
    }

    startGenerating(async () => {
      try {
        const generated = await generateWeeklySummary(clientId, weekStart);
        setNarrative(generated);
        setMessage("Weekly summary generated from logged behavior frequencies.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to generate weekly summary.");
      }
    });
  }

  return (
    <form action={saveWeeklySummary} className="grid gap-4 rounded-md border bg-white/95 p-5 shadow-lg shadow-primary/5 lg:grid-cols-2">
      <div>
        <Label htmlFor="clientId">Client</Label>
        <Select id="clientId" name="clientId" required value={clientId} onChange={(event) => setClientId(event.target.value)}>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="weekStart">Week of</Label>
        <Input id="weekStart" name="weekStart" type="date" required value={weekStart} onChange={(event) => setWeekStart(event.target.value)} />
      </div>
      <div className="lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="narrative">Weekly summary</Label>
          <Button type="button" variant="secondary" size="sm" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isGenerating ? "Generating..." : "✨ Auto generate summary"}
          </Button>
        </div>
        <Textarea
          id="narrative"
          name="narrative"
          required
          value={narrative}
          onChange={(event) => setNarrative(event.target.value)}
          placeholder="Summarize the week for this client."
        />
        {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
      </div>
      <div>
        <Label htmlFor="attestationName">Printed attestation name</Label>
        <Input id="attestationName" name="attestationName" />
      </div>
      <div>
        <Label htmlFor="signatureText">Typed signature</Label>
        <Input id="signatureText" name="signatureText" />
      </div>
      <div>
        <Label htmlFor="password">Password to sign</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" />
      </div>
      <SubmitButtons />
    </form>
  );
}
