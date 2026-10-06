import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerSession, issueOtp } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, "checkout_otp", 5))) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = body.email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({
        error: "An account with this email already exists. Please log in.",
        exists: true,
      }, { status: 400 });
    }

    const session = await getCustomerSession();
    const otp = issueOtp(session, "checkout", normalizedEmail);
    const emailSent = await sendOtpEmail(normalizedEmail, otp);

    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send verification email." }, { status: 500 });
    }

    await session.save();

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    console.error("Checkout send-otp error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
