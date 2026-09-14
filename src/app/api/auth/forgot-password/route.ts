import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    
    // Strict rate limit: 3 requests per 15 mins for forgot password
    if (!(await checkRateLimit(ip, "forgot_password", 3))) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body.email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const email = body.email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // To prevent email enumeration, always return success even if user doesn't exist
    if (!user) {
      return NextResponse.json({ success: true, message: "If an account exists, an OTP has been sent." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

    const emailSent = await sendOtpEmail(email, otp);
    
    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send verification email. Please try again later." }, { status: 500 });
    }

    // Save state to session
    const session = await getCustomerSession();
    session.resetEmail = email;
    session.resetOtp = otp;
    await session.save();

    return NextResponse.json({
      success: true,
      message: "If an account exists, an OTP has been sent.",
    });

  } catch (error) {
    console.error("Forgot password route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
