"use client";

import { useState, useTransition } from "react";
import { updateWeeklySummaryWetSignedPrinted } from "@/lib/actions/weekly-summaries";

export function WeeklyDocumentationCheckbox({
  summaryId,
  initialChecked
}: {
  summaryId: string;
  initialChecked: boolean;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [isPending, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={isPending}
      aria-label="Printed and wet-signed"
      className="h-4 w-4 accent-primary disabled:cursor-wait disabled:opacity-60"
      onChange={(event) => {
        const nextChecked = event.target.checked;
        setChecked(nextChecked);
        startTransition(async () => {
          try {
            await updateWeeklySummaryWetSignedPrinted(summaryId, nextChecked);
          } catch {
            setChecked(!nextChecked);
          }
        });
      }}
    />
  );
}
