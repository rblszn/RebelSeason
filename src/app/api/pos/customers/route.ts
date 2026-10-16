import { badRequest, ok } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { normalizePhone } from "@/lib/phone";
import { findCustomerByPhone } from "@/lib/pos/customer";

export const dynamic = "force-dynamic";

/** Look up a customer by mobile number (shop + online history). */
export const GET = posRoute("CASHIER", async (_session, request: Request) => {
  const phone = normalizePhone(new URL(request.url).searchParams.get("phone"));
  if (!phone) throw badRequest("Enter a valid 10-digit mobile number");
  return ok({ customer: await findCustomerByPhone(phone) });
});
