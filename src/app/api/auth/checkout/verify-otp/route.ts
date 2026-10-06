import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { checkOtp, getCustomerSession, otpErrorMessage, setDisplayNameCookie } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (!(await checkRateLimit(ip, "checkout_verify", 10))) {
      return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.otp !== "string" || typeof body.email !== "string") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { otp, name, phone } = body;
    const email = body.email.toLowerCase().trim();
    const session = await getCustomerSession();

    // The OTP is bound to the email it was sent to, so it cannot be used to
    // create an account for a different address.
    const result = checkOtp(session, "checkout", otp, email);
    if (result !== "ok") {
      await session.save();
      return NextResponse.json({ error: otpErrorMessage(result) }, { status: 400 });
    }

    // Guest accounts get an unguessable password; the customer can set their
    // own later through "Forgot password".
    const randomPassword = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
    const finalName = (typeof name === "string" && name.trim()) || email.split("@")[0] || "Guest User";

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: finalName.slice(0, 100),
        email,
        phone: typeof phone === "string" && phone.trim() ? phone.trim().slice(0, 20) : null,
        password: randomPassword,
        role: "CUSTOMER",
      },
    });

    if (user.role !== "CUSTOMER") {
      await session.save();
      return NextResponse.json({ error: "Please log in to continue." }, { status: 403 });
    }

    session.userId = user.id;
    session.email = user.email;
    session.name = user.name;
    session.role = "CUSTOMER";
    session.isLoggedIn = true;
    await session.save();
    await setDisplayNameCookie(user.name);

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
