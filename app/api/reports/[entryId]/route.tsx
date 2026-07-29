import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { CBHSReport } from "@/lib/pdf/cbhs-report";

export async function GET(request: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { entryId } = await params;
  const entry = await prisma.cBHSEntry.findUnique({
    where: { id: entryId },
    include: { client: true, staff: true, behaviors: { include: { behavior: true } } }
  });

  if (!entry || entry.status !== "SIGNED") {
    return new NextResponse("Signed entry not found", { status: 404 });
  }

  await audit("EXPORT_PDF", { userId: user.id, request, details: `Exported PDF report for entry ${entry.id}.` });

  const blob = await pdf(<CBHSReport entry={entry} />).toBlob();
  const arrayBuffer = await blob.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cbhs-${entry.client.clientId}-${entry.date.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
