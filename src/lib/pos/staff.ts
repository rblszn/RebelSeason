import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { badRequest, conflict, notFound, unauthorized } from "@/lib/api";
import { hashPin, posRoleOf } from "@/lib/pos-auth";
import type { CreateStaffInput, UpdateStaffInput } from "@/lib/pos/validations";

/**
 * POS staff accounts (Admin -> Staff & devices). Staff are User rows with role MANAGER /
 * CASHIER and a StaffProfile (PIN, discount limit, active flag). The owner (ADMIN) can also
 * have a PIN. Staff can never sign in to the website or the admin panel.
 */

// Compared against when the email doesn't exist, so response time doesn't reveal which emails exist.
const DUMMY_HASH = "$2b$10$4zRr3Y3yHAyUap1om1Wa/er4KIS3fJvCX1EXTiGY3HQgDLxVX/n.2";

/**
 * Email + password check for registering a POS device. Allowed: the owner (ADMIN) and active
 * managers who were given a password. Same error for every failure.
 */
export async function verifyDeviceCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, password: true, staffProfile: { select: { isActive: true } } },
  });
  const matches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);
  const allowed = user?.role === "ADMIN" || (user?.role === "MANAGER" && user.staffProfile?.isActive);
  if (!user || !matches || !user.password || !allowed) {
    throw unauthorized("Incorrect email or password, or this account can't set up POS devices");
  }
  return { id: user.id };
}

export async function adminListStaff() {
  const [users, devices] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER", "CASHIER"] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        staffProfile: { select: { maxDiscountPercent: true, isActive: true, lockedUntil: true } },
        _count: { select: { billsAsCashier: true } },
      },
    }),
    prisma.posDevice.findMany({
      orderBy: [{ revokedAt: { sort: "asc", nulls: "first" } }, { lastSeenAt: "desc" }],
      include: { registeredBy: { select: { name: true, email: true } } },
    }),
  ]);
  return {
    staff: users.map(({ password, _count, staffProfile, ...u }) => ({
      ...u,
      posRole: posRoleOf(u.role)!,
      hasPassword: Boolean(password),
      hasPin: Boolean(staffProfile),
      maxDiscountPercent: u.role === "ADMIN" ? 100 : (staffProfile?.maxDiscountPercent ?? 0),
      isActive: staffProfile?.isActive ?? u.role === "ADMIN",
      pinLocked: Boolean(staffProfile?.lockedUntil && staffProfile.lockedUntil > new Date()),
      billCount: _count.billsAsCashier,
    })),
    devices: devices.map((d) => ({
      id: d.id,
      name: d.name,
      registeredBy: d.registeredBy.name || d.registeredBy.email || "",
      createdAt: d.createdAt.toISOString(),
      lastSeenAt: d.lastSeenAt.toISOString(),
      revoked: Boolean(d.revokedAt),
    })),
  };
}

export async function createStaff(input: CreateStaffInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { role: true } });
  if (existing && existing.role !== "CUSTOMER") throw conflict("That email already belongs to a staff member");
  if (existing) throw conflict("That email belongs to a customer account. Use a different email for staff.");
  if (input.password && input.role !== "MANAGER") throw badRequest("Only managers can have a password (to register POS devices)");

  const [pinHash, passwordHash] = await Promise.all([hashPin(input.pin), input.password ? bcrypt.hash(input.password, 12) : null]);
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      password: passwordHash,
      staffProfile: { create: { pinHash, maxDiscountPercent: input.maxDiscountPercent } },
    },
    select: { id: true },
  });
}

export async function updateStaff(userId: string, input: UpdateStaffInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, staffProfile: { select: { userId: true } } } });
  if (!user || !["MANAGER", "CASHIER"].includes(user.role)) throw notFound("Staff member not found");
  const role = input.role ?? user.role;
  if (input.password && role !== "MANAGER") throw badRequest("Only managers can have a password (to register POS devices)");

  const pinHash = input.pin ? await hashPin(input.pin) : undefined;
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : input.password === null || role !== "MANAGER" ? null : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { ...(input.name ? { name: input.name } : {}), ...(input.role ? { role: input.role } : {}), ...(passwordHash !== undefined ? { password: passwordHash } : {}) },
    });
    const profile = {
      ...(pinHash ? { pinHash, failedPinAttempts: 0, lockedUntil: null } : {}),
      ...(input.maxDiscountPercent !== undefined ? { maxDiscountPercent: input.maxDiscountPercent } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    };
    if (user.staffProfile) await tx.staffProfile.update({ where: { userId }, data: profile });
    else if (pinHash) await tx.staffProfile.create({ data: { userId, pinHash, maxDiscountPercent: input.maxDiscountPercent ?? 10, isActive: input.isActive ?? true } });
    // Deactivating (or a new PIN / role) signs the person out of every POS device straight away.
    if (input.isActive === false || pinHash || (input.role && input.role !== user.role)) await tx.posSession.deleteMany({ where: { userId } });
  });
}

/** Set or change the owner's own POS PIN. */
export async function setOwnerPin(ownerId: string, pin: string) {
  const pinHash = await hashPin(pin);
  await prisma.staffProfile.upsert({
    where: { userId: ownerId },
    update: { pinHash, failedPinAttempts: 0, lockedUntil: null, isActive: true },
    create: { userId: ownerId, pinHash, maxDiscountPercent: 100 },
  });
}

/** Stop a lost or old device from opening the POS (its staff sessions end immediately). */
export async function revokeDevice(deviceId: string) {
  const device = await prisma.posDevice.findUnique({ where: { id: deviceId }, select: { id: true } });
  if (!device) throw notFound("Device not found");
  await prisma.$transaction([
    prisma.posSession.deleteMany({ where: { deviceId } }),
    prisma.posDevice.update({ where: { id: deviceId }, data: { revokedAt: new Date() } }),
  ]);
}
