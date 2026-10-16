import { ok, parseBody } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { ownerPinSchema } from "@/lib/pos/validations";
import { setOwnerPin } from "@/lib/pos/staff";

/** The owner sets their own POS PIN (for quick unlock and approving discounts). */
export const PUT = adminRoute(async (admin, request: Request) => {
  const { pin } = await parseBody(request, ownerPinSchema);
  await setOwnerPin(admin.userId, pin);
  return ok({ success: true });
});
