import { badRequest, ok } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { stockLookup } from "@/lib/pos/units";

export const dynamic = "force-dynamic";

/** Stock check: scan a tag to see every size of that product. */
export const GET = posRoute("CASHIER", async (_session, request: Request) => {
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) throw badRequest("Scan or type a barcode");
  return ok(await stockLookup(code.slice(0, 64)));
});
