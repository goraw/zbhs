"use client";

import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { regenerateWeeklySummary } from "@/lib/actions/weekly-summaries";
import { Button } from "@/components/ui/button";

export function WeeklyRegenerateButton({ summaryId }: { summaryId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          setMessage("");
          setError("");
          startTransition(async () => {
            try {
              await regenerateWeeklySummary(summaryId);
              setMessage("Summary regenerated.");
              router.refresh();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "Unable to regenerate summary.");
            }
          });
        }}
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {isPending ? "Generating..." : "Auto generate"}
      </Button>
      {message ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-xs text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {message}
          <button type="button" aria-label="Dismiss summary regenerated notice" onClick={() => setMessage("")}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : null}
      {error ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {error}
          <button type="button" aria-label="Dismiss summary regenerate error" onClick={() => setError("")}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : null}
    </div>
  );
}
