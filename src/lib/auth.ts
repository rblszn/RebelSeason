import { SessionOptions, getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { randomInt, timingSafeEqual } from "crypto";

export type OtpPurpose = "register" | "checkout" | "reset";

export interface PendingOtp {
  code: string;
  email: string;
  purpose: OtpPurpose;
  expiresAt: number;
  attempts: number;
}

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
  otp?: PendingOtp;
  pendingUser?: { name: string; email: string; phone?: string; passwordHash: string };
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

function requireSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} must be set to a random string of at least 32 characters`);
  }
  return devFallback;
}

export const sessionOptions: SessionOptions = {
  password: requireSecret("SESSION_SECRET", "dev_only_customer_session_secret_not_for_production_use"),
  cookieName: "rebel_season_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export const adminSessionOptions: SessionOptions = {
  password: requireSecret("ADMIN_SESSION_SECRET", "dev_only_admin_session_secret_not_for_production_use!!"),
  cookieName: "rebel_season_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict" as const,
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

/**
 * Non-sensitive, JS-readable cookie holding only the customer's display name.
 * Lets the storefront header show the signed-in state without reading the
 * session server-side, which keeps every catalog page statically cacheable.
 */
export const DISPLAY_NAME_COOKIE = "rs_display_name";

export async function setDisplayNameCookie(name: string) {
  const cookieStore = await cookies();
  // Next.js URL-encodes cookie values itself; the header decodes once.
  cookieStore.set(DISPLAY_NAME_COOKIE, name.slice(0, 60), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionOptions.cookieOptions?.maxAge,
  });
}

export async function clearDisplayNameCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(DISPLAY_NAME_COOKIE);
}

// ---------------------------------------------------------------------------
// One-time passwords
// ---------------------------------------------------------------------------

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

export function issueOtp(session: { otp?: PendingOtp }, purpose: OtpPurpose, email: string): string {
  const code = randomInt(100000, 1000000).toString();
  session.otp = { code, email, purpose, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 };
  return code;
}

export type OtpCheck = "ok" | "missing" | "expired" | "invalid" | "locked";

/**
 * Checks a submitted OTP against the one stored in the session. The OTP is
 * bound to both a purpose and an email address, so a code issued for one
 * address cannot be used to verify another. The caller must save the session.
 */
export function checkOtp(session: { otp?: PendingOtp }, purpose: OtpPurpose, code: unknown, email?: string): OtpCheck {
  const otp = session.otp;
  if (!otp || otp.purpose !== purpose) return "missing";
  if (Date.now() > otp.expiresAt) {
    session.otp = undefined;
    return "expired";
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    session.otp = undefined;
    return "locked";
  }
  if (email !== undefined && otp.email !== email.toLowerCase().trim()) return "invalid";

  const submitted = Buffer.from(String(code ?? "").trim());
  const expected = Buffer.from(otp.code);
  const matches = submitted.length === expected.length && timingSafeEqual(submitted, expected);
  if (!matches) {
    otp.attempts += 1;
    return "invalid";
  }
  session.otp = undefined;
  return "ok";
}

export function otpErrorMessage(result: OtpCheck): string {
  switch (result) {
    case "expired":
      return "This code has expired. Please request a new one.";
    case "locked":
      return "Too many incorrect attempts. Please request a new code.";
    case "missing":
      return "No verification in progress. Please request a new code.";
    default:
      return "Invalid verification code.";
  }
}
