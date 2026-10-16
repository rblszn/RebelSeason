import { z } from "zod";
import { forbidden, ok, parseBody } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { verifyApproval } from "@/lib/pos-auth";
import { pinSchema } from "@/lib/pos/validations";

const schema = z.object({ staffId: z.string().min(1).max(50), pin: pinSchema, discountPercent: z.number().min(0).max(100).optional() });

/**
 * Check a manager's approval PIN as soon as it's entered (and that their own discount limit
 * covers the discount), so the cashier finds out before taking payment. The bill is checked
 * again on save.
 */
export const POST = posRoute("CASHIER", async (_session, request: Request) => {
  const { staffId, pin, discountPercent } = await parseBody(request, schema);
  const approver = (await verifyApproval({ staffId, pin }))!;
  if (discountPercent !== undefined && discountPercent > approver.maxDiscountPercent) {
    throw forbidden(`${approver.name} can approve up to ${approver.maxDiscountPercent}%. Ask someone with a higher limit.`);
  }
  return ok({ approver: { id: approver.id, name: approver.name } });
});
