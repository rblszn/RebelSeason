import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrderById } from "@/lib/dal/orders";
import { OrderStatus } from "@prisma/client";
import { sendShippingNotificationEmail } from "@/lib/mail";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, trackingUrl } = body as { status: OrderStatus; trackingUrl?: string };

    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existingOrder = await getOrderById(id);
    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updateData: any = { status };
    if (status === "SHIPPED" && trackingUrl) {
      updateData.trackingUrl = trackingUrl;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        items: true,
        payment: true,
      },
    });

    if (status === "SHIPPED" && trackingUrl && updatedOrder.customerEmail) {
      await sendShippingNotificationEmail(updatedOrder.customerEmail, updatedOrder, trackingUrl);
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
