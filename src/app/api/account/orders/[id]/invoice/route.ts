import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth";
import { getOrderById } from "@/lib/dal/orders";
import { invoiceHeaders, renderInvoiceHtml } from "@/lib/invoice";

export const dynamic = "force-dynamic";

// A customer's own invoice. Another customer's order answers "not found" so its existence is not revealed.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Please sign in" }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order || order.customerId !== session.userId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const autoPrint = request.nextUrl.searchParams.get("print") === "1";
  return new NextResponse(renderInvoiceHtml(order, { autoPrint }), { headers: invoiceHeaders });
}
