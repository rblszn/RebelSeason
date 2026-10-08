import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  getCustomerSession,
  getAdminSession,
  setDisplayNameCookie,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const isAllowed = await checkRateLimit(ip, "login", 5);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const { email, password, portal } = body as {
      email?: string;
      password?: string;
      portal?: string;
    };

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Strict role separation: the admin portal only accepts admin accounts and
    // the website only accepts customers. The website answers exactly as it does
    // for a wrong password, so it does not reveal that an admin account exists.
    if (portal === "admin") {
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Access denied. Admin credentials required." },
          { status: 403 }
        );
      }
    } else if (user.role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Role-based session management with dual cookies
    if (user.role === "ADMIN") {
      const adminSession = await getAdminSession();
      adminSession.userId = user.id;
      adminSession.email = user.email;
      adminSession.name = user.name;
      adminSession.role = "ADMIN";
      adminSession.isLoggedIn = true;
      adminSession.isPending2FA = false;
      await adminSession.save();

      return NextResponse.json({
        success: true,
        message: "Admin authentication successful",
        role: "ADMIN",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        redirectTo: "/admin",
      });
    } else {
      const customerSession = await getCustomerSession();
      customerSession.userId = user.id;
      customerSession.email = user.email;
      customerSession.name = user.name;
      customerSession.role = "CUSTOMER";
      customerSession.isLoggedIn = true;
      await customerSession.save();
      await setDisplayNameCookie(user.name);

      return NextResponse.json({
        success: true,
        message: "Customer authentication successful",
        role: "CUSTOMER",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        redirectTo: "/account",
      });
    }
  } catch (error) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Customer sessions only; the admin session is never exposed to the website.
    const customerSession = await getCustomerSession();
    if (customerSession.isLoggedIn) {
      return NextResponse.json({
        isLoggedIn: true,
        role: "CUSTOMER",
        user: {
          id: customerSession.userId,
          email: customerSession.email,
          name: customerSession.name,
          role: customerSession.role,
        },
      });
    }

    return NextResponse.json({
      isLoggedIn: false,
      role: null,
      user: null,
    });
  } catch (error) {
    console.error("Session check error:", error);
    return NextResponse.json(
      { error: "Failed to check session status" },
      { status: 500 }
    );
  }
}
