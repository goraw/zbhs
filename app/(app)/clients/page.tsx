import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clients</h1>
        <p className="text-sm text-muted-foreground">Local client records used for CBHS session logs.</p>
      </div>
      <form action={createClient} className="grid gap-4 rounded-md border bg-white p-5 shadow-sm md:grid-cols-5">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="dob">DOB</Label>
          <Input id="dob" name="dob" type="date" required />
        </div>
        <div>
          <Label htmlFor="clientId">Client ID</Label>
          <Input id="clientId" name="clientId" required />
        </div>
        <div>
          <Label htmlFor="authorizationTier">Authorization tier</Label>
          <Input id="authorizationTier" name="authorizationTier" required />
        </div>
        <div className="flex items-end">
          <Button type="submit">Add client</Button>
        </div>
      </form>
      <div className="overflow-hidden rounded-md border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr><th className="p-3">Name</th><th className="p-3">Client ID</th><th className="p-3">Tier</th><th className="p-3">DOB</th></tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr className="border-t" key={client.id}>
                <td className="p-3 font-medium">{client.name}</td>
                <td className="p-3">{client.clientId}</td>
                <td className="p-3">{client.authorizationTier}</td>
                <td className="p-3">{client.dob.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
