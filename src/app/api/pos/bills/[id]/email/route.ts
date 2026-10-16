import { clientIp, ok, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { posRoute } from "@/lib/pos-api";
import { emailBillSchema } from "@/lib/pos/validations";
import { getBill } from "@/lib/pos/bill";
import { sendPosBillEmail } from "@/lib/mail";
import { formatStoreAddress, getStoreSettings } from "@/lib/pos/settings";

/** Email (or re-email) a bill to the address the customer gives. */
export const POST = posRoute("CASHIER", async (_session, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { email } = await parseBody(request, emailBillSchema);
  if (!(await rateLimit({ key: `pos-bill-email:${clientIp(request)}`, limit: 30, windowSeconds: 3600 })).success) {
    throw tooMany("Too many emails sent. Please try again later.");
  }
  const [bill, s] = await Promise.all([getBill(id), getStoreSettings()]);
  await sendPosBillEmail(email, bill, { storeName: s.storeName, address: formatStoreAddress(s), phone: s.phone, billFooter: s.billFooter }, { resend: true });
  return ok({ success: true });
});
