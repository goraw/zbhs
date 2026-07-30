import Link from "next/link";
import { FileText, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { saveWeeklySummary } from "@/lib/actions/weekly-summaries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

export default async function WeeklyPage() {
  const [clients, summaries] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.weeklySummary.findMany({
      include: { client: true, staff: true },
      orderBy: { weekStart: "desc" },
      take: 50
    })
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Weekly CBHS Summary</h1>
        <p className="text-sm text-muted-foreground">Summarize daily support logs into a weekly supervision packet.</p>
      </div>

      <form action={saveWeeklySummary} className="grid gap-4 rounded-md border bg-white p-5 shadow-sm lg:grid-cols-2">
        <div>
          <Label htmlFor="clientId">Client</Label>
          <Select id="clientId" name="clientId" required>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="weekStart">Week of</Label>
          <Input id="weekStart" name="weekStart" type="date" required />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="narrative">Weekly summary</Label>
          <Textarea id="narrative" name="narrative" required placeholder="Summarize the week for this client." />
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
        <div className="flex items-end gap-2">
          <Button type="submit" variant="secondary" name="intent" value="draft">Save draft</Button>
          <Button type="submit" name="intent" value="sign"><Lock className="h-4 w-4" />Sign and PDF</Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-md border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr><th className="p-3">Week</th><th className="p-3">Client</th><th className="p-3">Staff</th><th className="p-3">Status</th><th className="p-3">PDF</th></tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.id} className="border-t">
                <td className="p-3">{summary.weekStart.toLocaleDateString()} - {summary.weekEnd.toLocaleDateString()}</td>
                <td className="p-3 font-medium">{summary.client.name}</td>
                <td className="p-3">{summary.staff.name}</td>
                <td className="p-3">{summary.status === "SIGNED" ? <span className="inline-flex items-center gap-1 text-primary"><Lock className="h-4 w-4" />Signed</span> : "Draft"}</td>
                <td className="p-3">{summary.status === "SIGNED" ? <Link className="inline-flex items-center gap-1 text-primary underline" href={`/api/reports/weekly/${summary.id}`}><FileText className="h-4 w-4" />Weekly PDF</Link> : "Sign first"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
