import { SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
  pendingOtp?: string;
  pendingUser?: { name: string; email: string; phone?: string; passwordHash: string };
  resetEmail?: string;
  resetPhone?: string;
  resetOtp?: string;
  isLoggedIn: boolean;
}

export interface AdminSessionData {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN";
  isLoggedIn: boolean;
  isPending2FA?: boolean;
  tempUserId?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long_rebel_season_2024!",
  cookieName: "rebel_season_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export const adminSessionOptions: SessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET || "complex_admin_password_at_least_32_characters_rebel_season_2024!",
  cookieName: "rebel_season_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export const defaultSession: SessionData = {
  userId: "",
  email: "",
  name: "",
  role: "CUSTOMER",
  isLoggedIn: false,
};

export const defaultAdminSession: AdminSessionData = {
  userId: "",
  email: "",
  name: "",
  role: "ADMIN",
  isLoggedIn: false,
};

// Helpers for Server Components and Route Handlers
export async function getCustomerSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSessionData>(cookieStore, adminSessionOptions);
}
