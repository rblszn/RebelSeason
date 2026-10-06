import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { confirmPaymentWithRazorpay } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const razorpayOrderId = typeof body?.razorpay_order_id === "string" ? body.razorpay_order_id : "";
    const razorpayPaymentId = typeof body?.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
    const signature = typeof body?.razorpay_signature === "string" ? body.razorpay_signature : "";

    if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // The order is looked up from the signed Razorpay order id, never from an
    // id supplied by the browser.
    const result = await confirmPaymentWithRazorpay(razorpayOrderId, razorpayPaymentId);

    if (result.status === "confirmed" || result.status === "already_confirmed") {
      const session = await getCustomerSession();
      if (session.userId !== result.customerId) {
        // Payment is valid but belongs to someone else's session: confirm it
        // without revealing the order.
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ success: true, orderId: result.orderId });
    }

    console.error(`[payments] verification failed for ${razorpayOrderId}: ${result.status}`);
    return NextResponse.json({ error: "Payment could not be confirmed" }, { status: 400 });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
