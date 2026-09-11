import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const addresses = await prisma.address.findMany({
      where: { userId: session.userId as string },
      orderBy: [
        { isDefault: 'desc' },
        { id: 'asc' }
      ]
    });
    return NextResponse.json(addresses);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, phone, street, city, state, pincode, country = 'India', isDefault = false } = body;

    if (!name || !phone || !street || !city || !state || !pincode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.userId as string },
        data: { isDefault: false }
      });
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: session.userId as string,
        name,
        phone,
        street,
        city,
        state,
        pincode,
        country,
        isDefault
      }
    });

    return NextResponse.json(newAddress);
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
