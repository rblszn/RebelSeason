import { ok, parseBody } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { quoteBillSchema } from "@/lib/pos/validations";
import { quoteBill } from "@/lib/pos/bill";

/** Price the current bill (coupon, discount limit, stock) without saving anything. */
export const POST = posRoute("CASHIER", async (session, request: Request) => {
  const input = await parseBody(request, quoteBillSchema);
  return ok({ quote: await quoteBill(session.staff, input) });
});
