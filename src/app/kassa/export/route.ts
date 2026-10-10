import type { NextRequest } from "next/server";
import { diffInDays, isIsoDate } from "@/lib/time";
import { getCurrentUser } from "@/server/auth/session";
import { exportSalesCsv } from "@/server/services/pos";

/** GET /kassa/export?van=YYYY-MM-DD&tot=YYYY-MM-DD → all receipt lines as CSV (for the accountant). */
export async function GET(request: NextRequest) {
  if (!(await getCurrentUser())) return new Response("Niet ingelogd.", { status: 401 });
  const from = request.nextUrl.searchParams.get("van") ?? "";
  const to = request.nextUrl.searchParams.get("tot") ?? from;
  if (!isIsoDate(from) || !isIsoDate(to) || to < from || diffInDays(from, to) > 400) {
    return new Response("Kies een geldige periode van maximaal een jaar.", { status: 400 });
  }
  const csv = await exportSalesCsv(from, to);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kassa-${from}${to === from ? "" : `-tm-${to}`}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
