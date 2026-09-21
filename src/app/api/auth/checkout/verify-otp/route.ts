import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, "checkout_verify", 5))) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.otp || !body.email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { otp, name, email, phone } = body;
    const session = await getCustomerSession();

    if (!session.pendingOtp || session.pendingOtp !== otp) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);
    const finalName = name?.trim() || email.split("@")[0] || "Guest User";

    const user = await prisma.user.create({
      data: {
        name: finalName,
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        password: dummyPassword,
        role: "CUSTOMER",
      },
    });

    session.pendingOtp = undefined;
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name;
    session.role = "CUSTOMER";
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({
      success: true,
      message: "Email verification successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      }
    });
  } catch (error) {
    console.error("Checkout verify-otp error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
