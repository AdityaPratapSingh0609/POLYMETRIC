import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { getAnalyticsOverview } from "@/lib/analytics";

export async function GET() {
  try {
    await requireRole(["ADMIN", "SUPERVISOR", "OPERATOR"]);
    const overview = await getAnalyticsOverview();
    return NextResponse.json(overview);
  } catch (error) {
    return handleApiError(error);
  }
}
