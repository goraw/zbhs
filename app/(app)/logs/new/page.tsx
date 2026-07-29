import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CBHSEntryForm } from "@/components/cbhs-entry-form";

export const dynamic = "force-dynamic";

export default async function NewLogPage() {
  const user = await getCurrentUser();
  const [clients, behaviors] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.behavior.findMany({ orderBy: { name: "asc" } })
  ]);

  return (
    <section>
      <h1 className="text-2xl font-semibold">New CBHS Entry</h1>
      <CBHSEntryForm clients={clients} behaviors={behaviors} staffName={user?.name ?? ""} />
    </section>
  );
}
