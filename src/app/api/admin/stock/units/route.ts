import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { searchUnits } from "@/lib/pos/units";

export const dynamic = "force-dynamic";

/** Find sizes (or products without sizes) by name or barcode, for the Adjust stock form. */
export const GET = adminRoute(async (_admin, request: Request) => {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  return ok({ units: q.length >= 2 ? await searchUnits(q) : [] });
});
