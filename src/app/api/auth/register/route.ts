import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCustomerSession } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    // Two flows:
    // 1. Initial Signup (Send OTP)
    // 2. Verify OTP

    if (body.action === "verify") {
      if (!(await checkRateLimit(ip, "otp_verify", 5))) {
        return NextResponse.json({ error: "Too many verification attempts. Please try again later." }, { status: 429 });
      }
      
      const { otp } = body;
      const session = await getCustomerSession();

      if (!session.pendingOtp || !session.pendingUser) {
        return NextResponse.json({ error: "Session expired or invalid. Please sign up again." }, { status: 400 });
      }

      if (session.pendingOtp !== otp) {
        return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
      }

      // OTP matches! Create the user in database.
      const user = await prisma.user.create({
        data: {
          name: session.pendingUser.name,
          email: session.pendingUser.email,
          phone: session.pendingUser.phone,
          password: session.pendingUser.passwordHash,
          role: "CUSTOMER",
        },
      });

      // Clear pending and set actual session
      session.pendingOtp = undefined;
      session.pendingUser = undefined;
      session.userId = user.id;
      session.email = user.email;
      session.name = user.name;
      session.role = "CUSTOMER";
      session.isLoggedIn = true;
      await session.save();

      return NextResponse.json({
        success: true,
        message: "Customer registration successful",
        redirectTo: "/account",
      });
    }

    // Initial Flow: SEND OTP
    if (!(await checkRateLimit(ip, "otp_generate", 5))) {
      return NextResponse.json({ error: "Too many sign up attempts. Please try again later." }, { status: 429 });
    }

    const { name, email, phone, password } = body;

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: "Name, email, phone, and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP

    const emailSent = await sendOtpEmail(normalizedEmail, otp);
    
    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send verification email. Please try again later." }, { status: 500 });
    }

    // Save state to session
    const session = await getCustomerSession();
    session.pendingOtp = otp;
    session.pendingUser = {
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash: hashedPassword,
    };
    await session.save();

    return NextResponse.json({
      success: true,
      requiresOtp: true,
      message: "OTP sent successfully to email",
    });

  } catch (error) {
    console.error("Register route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}
