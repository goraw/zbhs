import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { monthlyContentSchema, validMonth } from "@/lib/monthly-progress";
import { MonthlyProgressPdf } from "@/lib/pdf/monthly-progress-report";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!await prisma.user.findFirst({ where: { id: user.id, isActive: true }, select: { id: true } })) return new NextResponse("Forbidden", { status: 403 });
  const month = request.nextUrl.searchParams.get("month") ?? "";
  if (!validMonth(month)) return new NextResponse("Invalid month", { status: 400 });
  const { clientId } = await params;
  const report = await prisma.monthlyProgress.findUnique({ where: { clientId_month: { clientId, month } }, include: { client: true } });
  if (!report) return new NextResponse("Monthly report not found", { status: 404 });
  const revisionValue = request.nextUrl.searchParams.get("revision");
  const revision = revisionValue ? Number(revisionValue) : null;
  if (revisionValue && (!Number.isSafeInteger(revision) || Number(revision) <= 0)) return new NextResponse("Invalid revision", { status: 400 });
  const snapshot = revision ? await prisma.monthlyProgressRevision.findUnique({ where: { reportId_version: { reportId: report.id, version: revision } } }) : report;
  if (!snapshot) return new NextResponse("Revision not found", { status: 404 });
  const preview = request.nextUrl.searchParams.get("preview") === "1";
  const blob = await pdf(<MonthlyProgressPdf reports={[{ clientName: report.client.name, clientId: report.client.clientId, dob: report.client.dob, month, authorName: snapshot.authorName, status: snapshot.status, completedAt: snapshot.completedAt, version: snapshot.version, content: monthlyContentSchema.parse(JSON.parse(snapshot.content)) }]} />).toBlob();
  await audit(preview ? "PREVIEW_MONTHLY_PROGRESS_PDF" : "EXPORT_MONTHLY_PROGRESS_PDF", { userId: user.id, request, details: `Monthly progress ${report.id}, version ${snapshot.version}.` });
  return new NextResponse(await blob.arrayBuffer(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="monthly-progress-${month}-v${snapshot.version}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
