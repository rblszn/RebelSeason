import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getCustomerSession();
    const body = await req.json();
    const { items, address, phone, email } = body;

    if (!items || !items.length) {
      return NextResponse.json({ error: "Empty cart" }, { status: 400 });
    }

    let customerId = session.userId;

    if (!customerId) {
      // Find or create guest user
      const guestEmail = email || "guest_" + Date.now() + "@example.com";
      const guestName = address.name || "Guest";
      
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
    const total = subtotal + shipping;

    const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customerId,
        customerName: address.name || session.email || "Guest",
        customerEmail: email || session.email || "",
        customerPhone: phone || address.phone || "",
        subtotal,
        shipping,
        total,
        status: "PENDING",
        shippingAddress: address,
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

    return NextResponse.json({ orderId: order.id }, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
