import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import Razorpay from "razorpay";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    if (!(await checkRateLimit(ip, "checkout", 5, 60000))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const session = await getCustomerSession();
    const body = await req.json();
    const { items, address, phone, email, couponCode } = body;

    if (!items || !items.length) {
      return NextResponse.json({ error: "Empty cart" }, { status: 400 });
    }

    let customerId = session.userId;

    if (!customerId) {
      // Find or create guest user
      const guestEmail = email || "guest_" + Date.now() + "@example.com";
      const guestName = address?.name || "Guest";
      
      let user = await prisma.user.findUnique({ where: { email: guestEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: guestEmail,
            name: guestName,
            password: "guest_" + Date.now(),
            role: "CUSTOMER",
          }
        });
      }
      customerId = user.id;
    }

    const subtotal = items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    const shipping = subtotal > 2000 ? 0 : 100;

    // Validate and apply coupon
    let discount = 0;
    let validatedCouponCode: string | null = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase().trim() },
        include: { _count: { select: { redemptions: true } } },
      });

      if (coupon && coupon.isActive) {
        // Check expiry
        const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
        // Check limit
        const isLimitReached = coupon.maxLimit > 0 && coupon._count.redemptions >= coupon.maxLimit;
        // Check per-user
        const alreadyUsed = await prisma.couponRedemption.findUnique({
          where: { couponId_userId: { couponId: coupon.id, userId: customerId } },
        });

        if (!isExpired && !isLimitReached && !alreadyUsed) {
          if (coupon.type === "PERCENTAGE") {
            discount = Math.floor((subtotal * coupon.value) / 100);
          } else {
            discount = coupon.value;
          }
          discount = Math.min(discount, subtotal);
          validatedCouponCode = coupon.code;
        }
      }
    }

    const total = Math.max(0, subtotal - discount + shipping);

    const orderNumber = "RS-" + Date.now() + Math.floor(Math.random() * 1000);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customerId,
        customerName: address?.name || session.name || "Guest",
        customerEmail: email || session.email || "",
        customerPhone: phone || address?.phone || "",
        subtotal,
        discount,
        shipping,
        total,
        status: "PENDING",
        shippingAddress: address || {},
        couponCode: validatedCouponCode,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            variantName: item.size || null,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image,
          }))
        },
      }
    });

    // Save new address to user's account if they are logged in and it's a new address (no id)
    if (session.isLoggedIn && session.userId && !address.id) {
      try {
        await prisma.address.create({
          data: {
            userId: session.userId,
            name: address.name || session.name || "Guest",
            phone: phone || address.phone || "",
            street: address.street || "",
            city: address.city || "",
            state: address.state || "",
            pincode: address.pincode || "",
            country: "India",
          }
        });
      } catch (err) {
        console.error("Failed to save new address:", err);
      }
    }

    // Record coupon redemption
    if (validatedCouponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: validatedCouponCode } });
      if (coupon) {
        await prisma.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId: customerId,
            orderId: order.id,
          },
        });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        currency: "INR",
        method: "ONLINE",
        status: "UNPAID",
      }
    });

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpOrder = await razorpay.orders.create({
      amount: total * 100,
      currency: "INR",
      receipt: orderNumber,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { razorpayOrderId: rzpOrder.id }
    });

    return NextResponse.json({
      orderId: order.id,
      razorpayOrderId: rzpOrder.id,
      amount: total * 100,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
    }, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
