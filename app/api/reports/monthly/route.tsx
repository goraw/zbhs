import { NextRequest, NextResponse } from "next/server";
import { pdf } from "@react-pdf/renderer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { monthlyContentSchema, validMonth } from "@/lib/monthly-progress";
import { MonthlyProgressPdf } from "@/lib/pdf/monthly-progress-report";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (!await prisma.user.findFirst({ where: { id: user.id, isActive: true }, select: { id: true } })) return new NextResponse("Forbidden", { status: 403 });
  const month = request.nextUrl.searchParams.get("month") ?? "";
  if (!validMonth(month)) return new NextResponse("Invalid month", { status: 400 });
  const reports = await prisma.monthlyProgress.findMany({ where: { month }, include: { client: true }, orderBy: { client: { name: "asc" } } });
  if (!reports.length) return new NextResponse("No saved reports for this month", { status: 404 });
  const blob = await pdf(<MonthlyProgressPdf reports={reports.map((report) => ({ clientName: report.client.name, clientId: report.client.clientId, dob: report.client.dob, month, authorName: report.authorName, status: report.status, completedAt: report.completedAt, version: report.version, content: monthlyContentSchema.parse(JSON.parse(report.content)) }))} />).toBlob();
  const preview = request.nextUrl.searchParams.get("preview") === "1";
  await audit(preview ? "PREVIEW_MONTHLY_PROGRESS_PACKET" : "EXPORT_MONTHLY_PROGRESS_PACKET", { userId: user.id, request, details: `Monthly progress packet for ${month}; reports ${reports.map((report) => report.id + ":v" + report.version).join(", ")}.` });
  return new NextResponse(await blob.arrayBuffer(), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="monthly-progress-packet-${month}.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
