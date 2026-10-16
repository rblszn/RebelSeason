import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { posRoute } from "@/lib/pos-api";
import { forgetDevice } from "@/lib/pos-auth";

/** Remove this device from the POS (manager / owner). It must be set up again to be used. */
export const POST = posRoute("MANAGER", async (session) => {
  await prisma.$transaction([
    prisma.posSession.deleteMany({ where: { deviceId: session.deviceId } }),
    prisma.posDevice.update({ where: { id: session.deviceId }, data: { revokedAt: new Date() } }),
  ]);
  await forgetDevice();
  return ok({ success: true });
});
