import { badRequest } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { isIsoDate } from "@/lib/ist";
import { salesCsv } from "@/lib/pos/reports";

export const dynamic = "force-dynamic";

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD -> every order and shop bill in the range as CSV (opens in Excel). */
export const GET = adminRoute(async (_admin, request: Request) => {
  const sp = new URL(request.url).searchParams;
  const from = sp.get("from");
  const to = sp.get("to") ?? from;
  if (!isIsoDate(from) || !isIsoDate(to) || to < from) throw badRequest("Choose a valid date range");
  if (Date.parse(to) - Date.parse(from) > 366 * 86_400_000) throw badRequest("Export at most one year at a time");
  return new Response(await salesCsv(from, to), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="rebel-season-sales-${from}-to-${to}.csv"`,
      "cache-control": "no-store",
    },
  });
});
