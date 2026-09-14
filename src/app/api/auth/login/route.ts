import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  getCustomerSession,
  getAdminSession,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const isAllowed = await checkRateLimit(ip, "login", 5); // 5 requests per 15 min
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

    const { email, password, portal, isAdmin } = body as {
      email?: string;
      password?: string;
      portal?: string;
      isAdmin?: boolean;
    };

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
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

    // Strict role separation:
    // 1. Admin login portal cannot be used with customer credentials
    if (isAdmin === true || portal === "admin") {
      if (user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Access denied. Admin credentials required." },
          { status: 403 }
        );
      }
    }

    // 2. Customer storefront login cannot be used with admin credentials
    if (isAdmin === false || portal === "store" || portal === "customer") {
      if (user.role === "ADMIN") {
        return NextResponse.json(
          {
            error:
              "Admin credentials cannot be used for customer login. Please use the admin portal.",
          },
          { status: 403 }
        );
      }
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

/**
 * GET /api/auth/login
 * Returns active session info (admin or customer)
 */
export async function GET() {
  try {
    const adminSession = await getAdminSession();
    if (adminSession.isLoggedIn && adminSession.role === "ADMIN") {
      return NextResponse.json({
        isLoggedIn: true,
        role: "ADMIN",
        user: {
          id: adminSession.userId,
          email: adminSession.email,
          name: adminSession.name,
          role: adminSession.role,
        },
      });
    }

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
