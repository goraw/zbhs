import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CBHSEntryForm } from "@/components/cbhs-entry-form";

export const dynamic = "force-dynamic";

export default async function EditLogPage({ params }: { params: Promise<{ entryId: string }> }) {
  const [{ entryId }, user] = await Promise.all([params, getCurrentUser()]);
  const [entry, clients, staffUsers] = await Promise.all([
    prisma.cBHSEntry.findUnique({ where: { id: entryId } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { isActive: true, role: "STAFF" },
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  if (!entry) notFound();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Edit CBHS Log</h1>
      <CBHSEntryForm clients={clients} staffName={user?.name ?? ""} staffUsers={staffUsers} entry={entry} />
    </section>
  );
}
