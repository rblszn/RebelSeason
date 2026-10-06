import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { checkOtp, getCustomerSession, issueOtp, otpErrorMessage, setDisplayNameCookie } from "@/lib/auth";
import { sendOtpEmail } from "@/lib/mail";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (body.action === "verify") {
      if (!(await checkRateLimit(ip, "otp_verify", 10))) {
        return NextResponse.json({ error: "Too many verification attempts. Please try again later." }, { status: 429 });
      }

      const session = await getCustomerSession();
      const pendingUser = session.pendingUser;
      if (!pendingUser) {
        return NextResponse.json({ error: "Session expired or invalid. Please sign up again." }, { status: 400 });
      }

      const result = checkOtp(session, "register", body.otp, pendingUser.email);
      if (result !== "ok") {
        await session.save();
        return NextResponse.json({ error: otpErrorMessage(result) }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { email: pendingUser.email }, select: { id: true } });
      if (existing) {
        session.pendingUser = undefined;
        await session.save();
        return NextResponse.json({ error: "Account with this email already exists. Please log in." }, { status: 409 });
      }

      const user = await prisma.user.create({
        data: {
          name: pendingUser.name,
          email: pendingUser.email,
          phone: pendingUser.phone,
          password: pendingUser.passwordHash,
          role: "CUSTOMER",
        },
      });

      session.pendingUser = undefined;
      session.userId = user.id;
      session.email = user.email;
      session.name = user.name;
      session.role = "CUSTOMER";
      session.isLoggedIn = true;
      await session.save();
      await setDisplayNameCookie(user.name);

      return NextResponse.json({
        success: true,
        message: "Customer registration successful",
        redirectTo: "/account",
      });
    }

    // Initial flow: send OTP
    if (!(await checkRateLimit(ip, "otp_generate", 5))) {
      return NextResponse.json({ error: "Too many sign up attempts. Please try again later." }, { status: 429 });
    }

    const { name, email, phone, password } = body;

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_RE.test(normalizedEmail) || normalizedEmail.length > 254) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Account with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const session = await getCustomerSession();
    const otp = issueOtp(session, "register", normalizedEmail);

    const emailSent = await sendOtpEmail(normalizedEmail, otp);
    if (!emailSent) {
      return NextResponse.json({ error: "Failed to send verification email. Please try again later." }, { status: 500 });
    }

    session.pendingUser = {
      name: name.trim().slice(0, 100),
      email: normalizedEmail,
      phone: typeof phone === "string" && phone.trim() ? phone.trim().slice(0, 20) : undefined,
      passwordHash: hashedPassword,
    };
    await session.save();

    return NextResponse.json({
      success: true,
      requiresOtp: true,
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    console.error("Register route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration" },
      { status: 500 }
    );
  }
}
