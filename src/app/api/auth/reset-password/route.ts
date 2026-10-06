import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkOtp, getCustomerSession, otpErrorMessage } from "@/lib/auth";
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
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const session = await getCustomerSession();
    const email = session.otp?.purpose === "reset" ? session.otp.email : null;

    const result = checkOtp(session, "reset", otp);
    if (result !== "ok" || !email) {
      await session.save();
      return NextResponse.json({ error: otpErrorMessage(result === "ok" ? "missing" : result) }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.updateMany({
      where: { email, role: "CUSTOMER" },
      data: { password: hashedPassword },
    });

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
