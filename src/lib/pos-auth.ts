import { cache } from "react";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { AppError, forbidden, tooMany, unauthorized } from "./api";
import { generateToken, sha256 } from "./tokens";

/**
 * POS sign-in, separate from the website session:
 * 1. A device (phone / iPad / computer) is registered once by the owner or a manager with
 *    email + password. It gets a long-lived, HTTP-only device cookie.
 * 2. On a registered device, staff unlock the POS with their PIN. PINs are only accepted
 *    together with a valid device cookie, and wrong PINs are counted in the database.
 * 3. A POS session locks itself after POS_IDLE_MINUTES without activity (server-enforced).
 */
export const POS_DEVICE_COOKIE = "rebel_pos_device"; // keep in sync with src/proxy.ts
export const POS_SESSION_COOKIE = "rebel_pos_session"; // keep in sync with src/proxy.ts
const DEVICE_MAX_AGE = 365 * 24 * 60 * 60; // seconds
const SESSION_MAX_AGE = 14 * 60 * 60; // a shift; seconds
export const POS_IDLE_MINUTES = 10;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

/** Who can do what at the POS. The website ADMIN is the owner. */
export type PosRole = "CASHIER" | "MANAGER" | "OWNER";
const RANK: Record<PosRole, number> = { CASHIER: 1, MANAGER: 2, OWNER: 3 };

export function posRoleOf(role: Role): PosRole | null {
  if (role === "ADMIN") return "OWNER";
  if (role === "MANAGER") return "MANAGER";
  if (role === "CASHIER") return "CASHIER";
  return null;
}

export const atLeast = (role: PosRole, min: PosRole) => RANK[role] >= RANK[min];

export type PosStaff = {
  id: string;
  name: string;
  email: string | null;
  role: PosRole;
  /** Manual discount allowed without approval, % of the bill. The owner has no limit. */
  maxDiscountPercent: number;
};

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

// ---------------------------------------------------------------------------
// Device
// ---------------------------------------------------------------------------

/** The registered device this browser belongs to, or null. */
export const getPosDevice = cache(async () => {
  const token = (await cookies()).get(POS_DEVICE_COOKIE)?.value;
  if (!token) return null;
  const device = await prisma.posDevice.findUnique({ where: { tokenHash: sha256(token) } });
  return device && !device.revokedAt ? device : null;
});

/** Register this browser as a POS device. Route Handler only (sets a cookie). */
export async function registerDevice(name: string, registeredById: string) {
  const token = generateToken();
  const device = await prisma.posDevice.create({ data: { name, tokenHash: sha256(token), registeredById } });
  (await cookies()).set(POS_DEVICE_COOKIE, token, cookieOptions(DEVICE_MAX_AGE));
  return device;
}

export async function forgetDevice() {
  const store = await cookies();
  store.delete(POS_DEVICE_COOKIE);
  store.delete(POS_SESSION_COOKIE);
}

// ---------------------------------------------------------------------------
// Staff session
// ---------------------------------------------------------------------------

function toStaff(user: { id: string; name: string | null; email: string | null; role: Role; staffProfile: { maxDiscountPercent: number; isActive: boolean } | null }): PosStaff | null {
  const role = posRoleOf(user.role);
  if (!role) return null;
  // The owner can use the POS without a staff profile; everyone else needs an active one.
  if (role !== "OWNER" && !user.staffProfile?.isActive) return null;
  if (role === "OWNER" && user.staffProfile && !user.staffProfile.isActive) return null;
  return {
    id: user.id,
    name: user.name ?? user.email ?? "Staff",
    email: user.email,
    role,
    maxDiscountPercent: role === "OWNER" ? 100 : (user.staffProfile?.maxDiscountPercent ?? 0),
  };
}

const staffUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  staffProfile: { select: { maxDiscountPercent: true, isActive: true } },
} as const;

/** Start a POS session for `userId` on `deviceId`. Route Handler only (sets a cookie). */
export async function createPosSession(userId: string, deviceId: string) {
  const token = generateToken();
  await prisma.posSession.create({
    data: { id: sha256(token), userId, deviceId, expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) },
  });
  (await cookies()).set(POS_SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
}

/** End the POS session (lock). The device stays registered. */
export async function endPosSession() {
  const store = await cookies();
  const token = store.get(POS_SESSION_COOKIE)?.value;
  if (token) await prisma.posSession.deleteMany({ where: { id: sha256(token) } });
  store.delete(POS_SESSION_COOKIE);
}

/**
 * The signed-in POS staff member, or null when signed out / locked / the device was revoked.
 * Read-only apart from a throttled "last active" touch; safe in Server Components.
 */
export const getPosSession = cache(async (): Promise<{ staff: PosStaff; deviceId: string; deviceName: string } | null> => {
  const store = await cookies();
  const token = store.get(POS_SESSION_COOKIE)?.value;
  const deviceToken = store.get(POS_DEVICE_COOKIE)?.value;
  if (!token || !deviceToken) return null;

  // One query: session + its device + the staff member (the DB may be a slow hop away).
  const session = await prisma.posSession.findUnique({
    where: { id: sha256(token) },
    include: { user: { select: staffUserSelect }, device: { select: { id: true, name: true, tokenHash: true, revokedAt: true } } },
  });
  const now = Date.now();
  if (!session || session.expiresAt.getTime() < now) return null;
  // The session must belong to the device this browser holds, and that device must still be allowed.
  if (session.device.tokenHash !== sha256(deviceToken) || session.device.revokedAt) return null;
  if (now - session.lastActiveAt.getTime() > POS_IDLE_MINUTES * 60_000) return null; // auto-locked

  const staff = toStaff(session.user);
  if (!staff) return null;

  // Keep the session alive while in use; at most one write a minute.
  if (now - session.lastActiveAt.getTime() > 60_000) {
    await prisma.$transaction([
      prisma.posSession.update({ where: { id: session.id }, data: { lastActiveAt: new Date(now) } }),
      prisma.posDevice.update({ where: { id: session.device.id }, data: { lastSeenAt: new Date(now) } }),
    ]).catch(() => undefined);
  }
  return { staff, deviceId: session.device.id, deviceName: session.device.name };
});

/** Require a signed-in POS staff member with at least `min` role. Throws 401/403. */
export async function requirePos(min: PosRole = "CASHIER") {
  const session = await getPosSession();
  if (!session) throw new AppError(401, "The POS is locked. Please sign in again.", "POS_LOCKED");
  if (!atLeast(session.staff.role, min)) throw forbidden(min === "MANAGER" ? "Only a manager or the owner can do this" : "Only the owner can do this");
  return session;
}

// ---------------------------------------------------------------------------
// PINs
// ---------------------------------------------------------------------------

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

/**
 * Check a staff member's PIN. After PIN_MAX_ATTEMPTS wrong tries the PIN is locked for
 * PIN_LOCK_MINUTES (counted in the DB, so it holds across serverless instances).
 * Returns the staff member on success; throws on failure.
 */
export async function verifyStaffPin(userId: string, pin: string): Promise<PosStaff> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...staffUserSelect, staffProfile: { select: { maxDiscountPercent: true, isActive: true, pinHash: true, failedPinAttempts: true, lockedUntil: true } } },
  });
  const profile = user?.staffProfile;
  const staff = user ? toStaff(user) : null;
  if (!user || !profile || !staff) throw unauthorized("Wrong PIN");

  if (profile.lockedUntil && profile.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((profile.lockedUntil.getTime() - Date.now()) / 60_000);
    throw tooMany(`Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or ask the owner to reset it.`);
  }

  if (!(await bcrypt.compare(pin, profile.pinHash))) {
    const attempts = profile.failedPinAttempts + 1;
    const locked = attempts >= PIN_MAX_ATTEMPTS;
    await prisma.staffProfile.update({
      where: { userId },
      data: locked ? { failedPinAttempts: 0, lockedUntil: new Date(Date.now() + PIN_LOCK_MINUTES * 60_000) } : { failedPinAttempts: attempts },
    });
    throw unauthorized(locked ? `Wrong PIN. This PIN is locked for ${PIN_LOCK_MINUTES} minutes.` : `Wrong PIN (${PIN_MAX_ATTEMPTS - attempts} tries left)`);
  }

  if (profile.failedPinAttempts > 0 || profile.lockedUntil) {
    await prisma.staffProfile.update({ where: { userId }, data: { failedPinAttempts: 0, lockedUntil: null } });
  }
  return staff;
}

/** A manager/owner approving an action on someone else's session (e.g. a bigger discount). */
export async function verifyApproval(approval: { staffId: string; pin: string } | undefined, min: PosRole = "MANAGER") {
  if (!approval) return null;
  const approver = await verifyStaffPin(approval.staffId, approval.pin);
  if (!atLeast(approver.role, min)) throw forbidden("Approval needs a manager or the owner");
  return approver;
}

/** Active staff who can unlock this device with a PIN (for the sign-in screen). */
export async function listPinStaff() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "MANAGER", "CASHIER"] }, staffProfile: { isActive: true } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return users.map((u) => ({ id: u.id, name: u.name ?? u.email ?? "Staff", role: posRoleOf(u.role)! }));
}

/**
 * For POS pages (not API routes): signed out / locked → PIN screen; not allowed → POS home.
 * Pages must redirect rather than throw, so staff never see an error page.
 */
export async function requirePosPage(min: PosRole = "CASHIER") {
  const session = await getPosSession();
  if (!session) redirect("/pos/login");
  if (!atLeast(session.staff.role, min)) redirect("/pos?denied=1");
  return session;
}
