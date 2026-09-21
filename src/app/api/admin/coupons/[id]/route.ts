import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session.isLoggedIn || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { code, name, type, value, maxLimit, appliesTo, isActive, expiresAt } = body;

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase().trim() }),
        ...(name && { name: name.trim() }),
        ...(type && { type }),
        ...(value !== undefined && { value: parseInt(value) }),
        ...(maxLimit !== undefined && { maxLimit: parseInt(maxLimit) }),
        ...(appliesTo && { appliesTo }),
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    return NextResponse.json(coupon);
  } catch (error) {
    console.error("Error updating coupon:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session.isLoggedIn || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.coupon.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
