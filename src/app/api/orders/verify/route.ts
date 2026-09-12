import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { sendOrderConfirmationEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = body;

    const signatureBody = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(signatureBody)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id }
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "CAPTURED",
          razorpayPaymentId: razorpay_payment_id,
          capturedAt: new Date()
        }
      });
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
      include: { items: true }
    });

    try {
      await sendOrderConfirmationEmail(order.customerEmail, order);
    } catch (e) {
      console.error("Failed to send order confirmation email:", e);
    }

    return NextResponse.json({ success: true, orderId });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
