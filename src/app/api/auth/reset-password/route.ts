import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    
    // Strict rate limit: 5 requests per 15 mins for reset verification
    if (!(await checkRateLimit(ip, "reset_password", 5))) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body.otp !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ error: "OTP and new password are required" }, { status: 400 });
    }

    const { otp, password } = body;
    const session = await getCustomerSession();

    if (!session.resetEmail || !session.resetOtp) {
      return NextResponse.json({ error: "Session expired. Please request a new password reset." }, { status: 400 });
    }

    if (session.resetOtp !== otp.trim()) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    await prisma.user.update({
      where: { email: session.resetEmail },
      data: { password: hashedPassword },
    });

    // Clear reset fields from session
    session.resetEmail = undefined;
    session.resetOtp = undefined;
    await session.save();

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });

  } catch (error) {
    console.error("Reset password route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
