import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CBHSEntryForm } from "@/components/cbhs-entry-form";

export const dynamic = "force-dynamic";

export default async function EditLogPage({ params }: { params: Promise<{ entryId: string }> }) {
  const [{ entryId }, user] = await Promise.all([params, getCurrentUser()]);
  const [entry, clients] = await Promise.all([
    prisma.cBHSEntry.findUnique({ where: { id: entryId } }),
    prisma.client.findMany({ orderBy: { name: "asc" } })
  ]);

  if (!entry) notFound();

  return (
    <section>
      <h1 className="text-2xl font-semibold">Edit CBHS Log</h1>
      <CBHSEntryForm clients={clients} staffName={user?.name ?? ""} entry={entry} />
    </section>
  );
}
