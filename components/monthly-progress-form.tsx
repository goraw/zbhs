"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Eye, Loader2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { saveMonthlyProgress } from "@/lib/actions/monthly-progress";
import { noChangeMonthlyContent } from "@/lib/monthly-no-change";
import { adlOptions, blankMonthlyContent, medicationLabels, monthlyContentSchema, monthlySections, notificationLabels, observationLabels, suggestedMonthlySummary, type MonthlyContent } from "@/lib/monthly-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type InitialReport = { id: string; version: number; status: "SAVED" | "DRAFT" | "COMPLETED"; authorName: string; completedAt: string | null; content: MonthlyContent };

export function MonthlyProgressForm({ clientId, month, caregiver, report }: { clientId: string; month: string; caregiver: string; report: InitialReport | null }) {
  const router = useRouter();
  const form = useForm<MonthlyContent>({ resolver: zodResolver(monthlyContentSchema), defaultValues: report?.content ?? blankMonthlyContent() });
  const events = useFieldArray({ control: form.control, name: "events" });
  const [version, setVersion] = useState(report?.version ?? 0);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState({ ok: true, message: "" });
  const [summaryDraft, setSummaryDraft] = useState<string | null>(null);
  const [noChangeConfirmed, setNoChangeConfirmed] = useState(false);
  const pdfUrl = "/api/reports/monthly/" + clientId + "?month=" + month;
  const save = () => form.handleSubmit((content) => {
    setNotice({ ok: true, message: "" });
    startTransition(async () => {
      try {
        const result = await saveMonthlyProgress({ clientId, month, version, intent: "save", content });
        if (!result.ok) { setNotice({ ok: false, message: result.message }); return; }
        setVersion(result.report.version); form.reset(content);
        setNotice({ ok: true, message: "Report saved." });
        router.refresh();
      } catch { setNotice({ ok: false, message: "Unable to save. Your entries are still here; please try again." }); }
    });
  }, () => setNotice({ ok: false, message: "Check the form fields and text lengths before saving." }))();

  return <div className="space-y-5 pb-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-y py-3">
      <p className="text-sm"><span className="font-semibold">Caregiver / provider:</span> {caregiver}</p>
      <span className="text-xs font-semibold text-muted-foreground">{form.formState.isDirty ? "Unsaved changes" : version > 0 ? "Saved" : "Not saved"}</span>
    </div>
    {notice.message && <div role="status" className={(notice.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900") + " flex items-start justify-between gap-3 rounded-md border p-3 text-sm"}>{notice.message}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice({ ok: true, message: "" })}><X className="h-4 w-4" /></button></div>}
    <form onSubmit={(event) => event.preventDefault()}>
      <fieldset disabled={pending} className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 border-b pb-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noChangeConfirmed} onChange={(event) => setNoChangeConfirmed(event.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />I observed no significant change this month</label><Button type="button" variant="secondary" disabled={!noChangeConfirmed} onClick={() => {
          try {
            const content = noChangeMonthlyContent(form.getValues());
            form.setValue("sections", content.sections, { shouldDirty: true });
            form.setValue("significantChanges", content.significantChanges, { shouldDirty: true });
            form.setValue("summary", content.summary, { shouldDirty: true });
            setNoChangeConfirmed(false);
            setNotice({ ok: true, message: "No-change wording added. Review and save the report." });
          } catch (error) { setNotice({ ok: false, message: error instanceof Error ? error.message : "Review existing observations first." }); }
        }}>Apply no-change wording</Button></div>
        <div><Label htmlFor="monthly-home">Adult Family Home Name</Label><Input id="monthly-home" maxLength={150} {...form.register("homeName")} /></div>
        {monthlySections.map((section, index) => <section key={section.key} id={"monthly-" + section.key} className="space-y-4 border-b pb-6">
          <div className="flex flex-wrap items-end justify-between gap-3"><h2 className="text-lg font-semibold">{index + 1}. {section.title}</h2>
            <div className="w-full sm:w-56"><Label htmlFor={"status-" + section.key}>Observation</Label><Select id={"status-" + section.key} aria-label={section.title + " observation"} {...form.register(`sections.${section.key}.status`)}><option value="">Select status...</option>{Object.entries(observationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></div>
          </div>
          {section.key === "adls" && <div className="grid gap-2 sm:grid-cols-2">{adlOptions.map((option) => <label key={option} className="flex items-start gap-2 text-sm"><input type="checkbox" value={option} {...form.register("adlAssistance")} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />{option}</label>)}</div>}
          {section.key === "medication" && <div className="max-w-md"><Label htmlFor="monthly-medications">Medications administered as prescribed</Label><Select id="monthly-medications" {...form.register("medicationAdministration")}><option value="">Select...</option>{Object.entries(medicationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></div>}
          {section.key === "changes" && <div className="max-w-md"><Label htmlFor="monthly-significant">Any significant changes, incidents, or concerns?</Label><Select id="monthly-significant" {...form.register("significantChanges")}><option value="">Select...</option><option value="YES">Yes</option><option value="NO">No</option><option value="NOT_ASSESSED">Not assessed</option></Select></div>}
          <div className={section.fields.length > 1 ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>{section.fields.map((field) => <div key={field.key}><Label htmlFor={section.key + "-" + field.key}>{field.label}</Label><Textarea id={section.key + "-" + field.key} rows={3} className="min-h-24" maxLength={3000} {...form.register(`sections.${section.key}.notes.${field.key}`)} /></div>)}</div>
          {section.key === "changes" && (form.watch("significantChanges") === "YES" || events.fields.length > 0) && <div className="space-y-4">
            {events.fields.map((event, eventIndex) => <div key={event.id} className="space-y-4 rounded-md border bg-white p-4">
              <div className="flex items-center justify-between"><h3 className="font-semibold">Significant change {eventIndex + 1}</h3><button type="button" className="rounded p-2 text-muted-foreground hover:bg-red-50 hover:text-red-700" title="Remove change" aria-label={"Remove significant change " + (eventIndex + 1)} onClick={() => events.remove(eventIndex)}><Trash2 className="h-4 w-4" /></button></div>
              <div className="grid gap-4 md:grid-cols-2"><div><Label htmlFor={"event-date-" + eventIndex}>Date of change</Label><Input id={"event-date-" + eventIndex} type="date" min={month + "-01"} max={new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).toLocaleDateString("en-CA")} {...form.register(`events.${eventIndex}.date`)} /></div>
                <div><Label htmlFor={"event-notification-" + eventIndex}>Notification status</Label><Select id={"event-notification-" + eventIndex} {...form.register(`events.${eventIndex}.notification`)}><option value="">Select...</option>{Object.entries(notificationLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></div>
                <div><Label htmlFor={"event-description-" + eventIndex}>What happened</Label><Textarea id={"event-description-" + eventIndex} maxLength={3000} {...form.register(`events.${eventIndex}.description`)} /></div>
                <div><Label htmlFor={"event-action-" + eventIndex}>Action taken / resident response</Label><Textarea id={"event-action-" + eventIndex} maxLength={3000} {...form.register(`events.${eventIndex}.action`)} /></div>
                <div><Label htmlFor={"event-who-" + eventIndex}>Who was notified</Label><Input id={"event-who-" + eventIndex} maxLength={300} {...form.register(`events.${eventIndex}.notifiedWho`)} /></div>
                <div><Label htmlFor={"event-notified-" + eventIndex}>Notification date and time (Pacific)</Label><Input id={"event-notified-" + eventIndex} type="datetime-local" {...form.register(`events.${eventIndex}.notifiedAt`)} /></div>
              </div><div><Label htmlFor={"event-followup-" + eventIndex}>Follow-up needed / outcome</Label><Textarea id={"event-followup-" + eventIndex} maxLength={3000} {...form.register(`events.${eventIndex}.followUp`)} /></div>
            </div>)}
            <Button type="button" variant="secondary" disabled={events.fields.length >= 20} onClick={() => events.append({ date: "", description: "", action: "", notification: "", notifiedWho: "", notifiedAt: "", followUp: "" })}><Plus className="h-4 w-4" />Add significant change</Button>
          </div>}
        </section>)}
        <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">10. Overall Monthly Summary</h2><Button type="button" variant="secondary" onClick={() => {
          const draft = suggestedMonthlySummary(form.getValues());
          if (!draft) { setNotice({ ok: false, message: "Enter observations before generating a summary." }); return; }
          if (draft.length > 64000) { setNotice({ ok: false, message: "The summary is too long. Please write a shorter monthly summary." }); return; }
          setSummaryDraft(draft);
        }}><Sparkles className="h-4 w-4" />Generate summary</Button></div>
          {summaryDraft !== null && <div className="space-y-3 border-l-4 border-primary bg-muted p-4"><h3 className="font-semibold">Suggested summary</h3><p className="whitespace-pre-wrap text-sm">{summaryDraft}</p><div className="flex gap-2"><Button type="button" size="sm" onClick={() => { form.setValue("summary", summaryDraft, { shouldDirty: true }); setSummaryDraft(null); }}>Use summary</Button><Button type="button" size="sm" variant="secondary" onClick={() => setSummaryDraft(null)}>Cancel</Button></div></div>}
          <Label htmlFor="monthly-summary">Overall progress and well-being</Label><Textarea id="monthly-summary" rows={6} maxLength={64000} {...form.register("summary")} />
        </section>
      </fieldset>
      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-2 border-t bg-white/95 py-4 backdrop-blur">
        <Button type="button" disabled={pending} onClick={() => void save()}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{pending ? "Saving..." : "Save Report"}</Button>
        {version > 0 && !form.formState.isDirty ? <>
          <Button asChild variant="secondary"><Link href={pdfUrl + "&preview=1"} target="_blank" rel="noopener noreferrer" prefetch={false}><Eye className="h-4 w-4" />Preview</Link></Button>
          <Button asChild variant="secondary"><Link href={pdfUrl} prefetch={false}><Download className="h-4 w-4" />Download PDF</Link></Button>
        </> : <>
          <Button type="button" variant="secondary" disabled title="Save the report before previewing"><Eye className="h-4 w-4" />Preview</Button>
          <Button type="button" variant="secondary" disabled title="Save the report before downloading"><Download className="h-4 w-4" />Download PDF</Button>
        </>}
      </div>
    </form>
  </div>;
}
