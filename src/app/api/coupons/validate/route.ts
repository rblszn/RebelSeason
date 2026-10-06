import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/auth";
import { cartSchema, evaluateCoupon, priceCart } from "@/lib/checkout";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  code: z.string().trim().min(1).max(50),
  items: cartSchema,
});

export async function POST(request: Request) {
  try {
    // Limits brute-force guessing of coupon codes.
    if (!(await checkRateLimit(getClientIp(request), "coupon_validate", 10, 10 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const pricing = await priceCart(parsed.data.items);
    if (!pricing.ok) {
      return NextResponse.json({ error: pricing.error }, { status: 409 });
    }

    const session = await getCustomerSession();
    const result = await evaluateCoupon(parsed.data.code, pricing, session.isLoggedIn ? session.userId ?? null : null);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ valid: true, code: result.code, name: result.name, discount: result.discount });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 });
  }
}
