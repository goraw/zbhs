import { BookOpen, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { upsertBehavior } from "@/lib/actions/behaviors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const dynamic = "force-dynamic";

export default async function BehaviorsPage() {
  const [behaviors, clients] = await Promise.all([
    prisma.behavior.findMany({ include: { client: true }, orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Behavior Library</h1>
        <p className="text-sm text-muted-foreground">Reusable behavior definitions and default intervention language.</p>
      </div>

      <form action={upsertBehavior} className="grid gap-4 rounded-md border bg-white p-5 shadow-sm lg:grid-cols-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" required>
            <option value="AGGRESSIVE">Aggressive</option>
            <option value="SELF_HARM_RISK">Self-Harm Risk</option>
            <option value="INTRUSIVE">Intrusive</option>
            <option value="PROPERTY_DESTRUCTION">Property Destruction</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Input id="severity" name="severity" type="number" min="1" max="5" defaultValue="1" required />
        </div>
        <div>
          <Label htmlFor="clientRefId">Client scope</Label>
          <Select id="clientRefId" name="clientRefId">
            <option value="">Global</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </Select>
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" required />
        </div>
        <div className="lg:col-span-3">
          <Label htmlFor="defaultInterventions">Default interventions</Label>
          <Textarea id="defaultInterventions" name="defaultInterventions" required />
        </div>
        <div>
          <Button type="submit">
            <BookOpen className="h-4 w-4" />
            Save behavior
          </Button>
        </div>
      </form>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {behaviors.map((behavior) => (
          <article key={behavior.id} className="rounded-md border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{behavior.name}</h2>
                <p className="text-sm text-muted-foreground">{behavior.category.replaceAll("_", " ")}</p>
              </div>
              <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">S{behavior.severity}</span>
            </div>
            <p className="mt-3 text-sm">{behavior.description}</p>
            <p className="mt-3 text-sm text-muted-foreground">{behavior.defaultInterventions}</p>
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground"><Pencil className="h-3 w-3" /> {behavior.client?.name ?? "Global"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
