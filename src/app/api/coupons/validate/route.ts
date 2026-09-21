import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, cartTotal } = body;

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        _count: { select: { redemptions: true } },
      },
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: "This coupon is no longer active" }, { status: 400 });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ error: "This coupon has expired" }, { status: 400 });
    }

    if (coupon.maxLimit > 0 && coupon._count.redemptions >= coupon.maxLimit) {
      return NextResponse.json({ error: "This coupon has reached its usage limit" }, { status: 400 });
    }

    // Check per-user redemption
    const session = await getCustomerSession();
    if (session.isLoggedIn && session.userId) {
      const existingRedemption = await prisma.couponRedemption.findUnique({
        where: {
          couponId_userId: {
            couponId: coupon.id,
            userId: session.userId,
          },
        },
      });

      if (existingRedemption) {
        return NextResponse.json({ error: "You have already used this coupon" }, { status: 400 });
      }
    }

    // Calculate discount
    const baseAmount = cartTotal || 0;
    let discount = 0;

    if (coupon.type === "PERCENTAGE") {
      discount = Math.floor((baseAmount * coupon.value) / 100);
    } else {
      // FLAT
      discount = coupon.value;
    }

    // Cap discount to not exceed cart total
    discount = Math.min(discount, baseAmount);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: coupon.value,
      appliesTo: coupon.appliesTo,
      discount,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 });
  }
}
