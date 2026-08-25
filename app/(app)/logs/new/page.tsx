import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CBHSEntryForm } from "@/components/cbhs-entry-form";

export const dynamic = "force-dynamic";

export default async function NewLogPage() {
  const user = await getCurrentUser();
  const [clients, staffUsers] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  return (
    <section>
      <h1 className="text-2xl font-semibold">New CBHS Entry</h1>
      <CBHSEntryForm clients={clients} staffName={user?.name ?? ""} staffUsers={staffUsers} />
    </section>
  );
}
