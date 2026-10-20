import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getStaffSchedule } from "@/lib/staff-schedule";
import { scheduleCsv, scheduleFilters } from "@/lib/schedule-report";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  if (user.role !== "SUPER_ADMIN") return new NextResponse("Forbidden", { status: 403 });
  let filters;
  try { filters = scheduleFilters(Object.fromEntries(request.nextUrl.searchParams)); }
  catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "Invalid filters." }, { status: 400 }); }
  const rows = await getStaffSchedule(user, filters);
  await audit("EXPORT_STAFF_SCHEDULE", { userId: user.id, request, details: `Exported staff schedule ${filters.from} through ${filters.to}; ${rows.length} shifts; staff ${filters.staffId || "all"}; shift ${filters.shift || "all"}.` });
  return new NextResponse(scheduleCsv(rows), { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="staff-schedule-${filters.from}-${filters.to}.csv"`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  } });
}
