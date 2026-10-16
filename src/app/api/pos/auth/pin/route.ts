import { clientIp, handle, ok, parseBody, tooMany, unauthorized } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { createPosSession, endPosSession, getPosDevice, verifyStaffPin } from "@/lib/pos-auth";
import { pinSignInSchema } from "@/lib/pos/validations";

/** Unlock the POS with a staff PIN. Only works on a registered device. */
export const POST = handle(async (request: Request) => {
  const { staffId, pin } = await parseBody(request, pinSignInSchema);
  const device = await getPosDevice();
  if (!device) throw unauthorized("This device isn't set up for the POS yet");
  // Per-staff lockout is in the database (verifyStaffPin); this only slows down a single noisy client.
  if (!(await rateLimit({ key: `pos-pin-ip:${clientIp(request)}`, limit: 30, windowSeconds: 900 })).success) {
    throw tooMany("Too many attempts. Please wait a few minutes.");
  }
  const staff = await verifyStaffPin(staffId, pin);
  await endPosSession();
  await createPosSession(staff.id, device.id);
  return ok({ staff: { id: staff.id, name: staff.name, role: staff.role } });
});
