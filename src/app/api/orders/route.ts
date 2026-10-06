import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { addressSchema, cartSchema, createPendingOrder } from "@/lib/checkout";

export const dynamic = "force-dynamic";

const orderRequestSchema = z.object({
  items: cartSchema,
  address: addressSchema,
  phone: z.string().trim().max(20).optional().default(""),
  couponCode: z.string().trim().max(50).nullish(),
  expectedTotal: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getCustomerSession();
    if (!session.isLoggedIn || !session.userId) {
      return NextResponse.json({ error: "Please verify your email or log in to place an order." }, { status: 401 });
    }

    const ip = getClientIp(req);
    if (!(await checkRateLimit(`${ip}:${session.userId}`, "checkout", 10, 60000))) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const parsed = orderRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { error: first?.path[0] === "address" ? `Please check your address: ${first.message}` : "Invalid order details" },
        { status: 400 }
      );
    }
    const { items, address, couponCode, expectedTotal } = parsed.data;
    const phone = parsed.data.phone || address.phone;
    if (!/^[+\d][\d\s-]{7,18}$/.test(phone)) {
      return NextResponse.json({ error: "Please provide a valid phone number." }, { status: 400 });
    }

    const result = await createPendingOrder({
      userId: session.userId,
      name: session.name ?? "",
      email: session.email ?? "",
      phone,
      items,
      address: { ...address, phone: address.phone || phone },
      couponCode,
      expectedTotal,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code, productId: result.productId, total: result.total, prices: result.prices },
        { status: result.status }
      );
    }

    // Remember a newly entered address for next time (saved addresses carry an id).
    if (!address.id) {
      const { id, ...fields } = address;
      void id;
      prisma.address
        .create({ data: { ...fields, phone: fields.phone || phone, userId: session.userId, country: "India" } })
        .catch((err) => console.error("Failed to save new address:", err));
    }

    return NextResponse.json(
      {
        orderId: result.orderId,
        razorpayOrderId: result.razorpayOrderId,
        amount: result.amountPaise,
        currency: "INR",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
