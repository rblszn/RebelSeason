import { ok, parseBody } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { revalidateCatalog } from "@/lib/cache";
import { cancelBillSchema } from "@/lib/pos/validations";
import { cancelBill } from "@/lib/pos/bill";

/** Cancel a bill made by mistake (manager, or cashier with a manager's PIN). Stock goes back. */
export const POST = posRoute("CASHIER", async (session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { reason, approval } = await parseBody(request, cancelBillSchema);
  const bill = await cancelBill(session, id, reason, approval);
  revalidateCatalog("max");
  return ok({ bill });
});
