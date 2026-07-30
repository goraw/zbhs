import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { WeeklyCBHSReport } from "@/lib/pdf/weekly-cbhs-report";

export async function GET(request: NextRequest, { params }: { params: Promise<{ summaryId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { summaryId } = await params;
  const summary = await prisma.weeklySummary.findUnique({
    where: { id: summaryId },
    include: { client: true, staff: true }
  });

  if (!summary || summary.status !== "SIGNED") {
    return new NextResponse("Signed weekly summary not found", { status: 404 });
  }

  const entries = await prisma.cBHSEntry.findMany({
      where: {
        clientId: summary.clientId,
        date: { gte: summary.weekStart, lte: summary.weekEnd },
        status: "SIGNED"
      },
      include: { staff: true },
      orderBy: { date: "asc" }
    });

  await audit("EXPORT_WEEKLY_PDF", {
    userId: user.id,
    request,
    details: `Exported weekly CBHS PDF for summary ${summary.id}.`
  });

  const blob = await pdf(<WeeklyCBHSReport summary={summary} entries={entries} />).toBlob();
  const arrayBuffer = await blob.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cbhs-weekly-${summary.client.clientId}-${summary.weekStart.toISOString().slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
