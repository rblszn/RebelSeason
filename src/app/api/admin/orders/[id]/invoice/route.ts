import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/dal/orders";
import { invoiceHeaders, renderInvoiceHtml } from "@/lib/invoice";

export const dynamic = "force-dynamic";

// Admin invoice for any order. Protected by the /api/admin check in the proxy.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const autoPrint = request.nextUrl.searchParams.get("print") === "1";
  return new NextResponse(renderInvoiceHtml(order, { autoPrint }), { headers: invoiceHeaders });
}
