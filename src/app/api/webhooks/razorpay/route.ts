import { NextResponse } from "next/server";
import { verifyWebhookSignature, getRazorpay } from "@/lib/razorpay";
import { finalizePaidOrder, markPaymentFailed } from "@/lib/checkout";

export const dynamic = "force-dynamic";

interface PaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  error_description?: string;
}

/**
 * Razorpay webhook. Configure in Dashboard → Settings → Webhooks with
 *   URL:    https://<your-domain>/api/webhooks/razorpay
 *   Secret: the value of RAZORPAY_WEBHOOK_SECRET
 *   Events: payment.authorized, payment.captured, payment.failed, order.paid
 *
 * This is what confirms an order when the customer pays but closes the tab
 * before the browser callback reaches /api/orders/verify.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!verifyWebhookSignature(rawBody, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: PaymentEntity } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    switch (event.event) {
      case "payment.authorized": {
        // Only relevant when the account uses manual capture.
        const captured = await getRazorpay().payments.capture(payment.id, payment.amount, "INR");
        if (captured.status === "captured") {
          await finalizePaidOrder({ razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id, amountPaise: payment.amount });
        }
        break;
      }
      case "payment.captured":
      case "order.paid":
        await finalizePaidOrder({ razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id, amountPaise: payment.amount });
        break;
      case "payment.failed":
        await markPaymentFailed(payment.order_id, payment.error_description);
        break;
      default:
        return NextResponse.json({ ok: true, ignored: true });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Capturing an already-captured payment errors; that is not a failure.
    const message = error instanceof Error ? error.message : String(error);
    if (/already been captured/i.test(message) || (typeof error === "object" && error && "error" in error && /already been captured/i.test(JSON.stringify(error)))) {
      await finalizePaidOrder({ razorpayOrderId: payment.order_id, razorpayPaymentId: payment.id, amountPaise: payment.amount });
      return NextResponse.json({ ok: true });
    }
    console.error("Razorpay webhook error:", error);
    // A 5xx makes Razorpay retry the delivery later.
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
