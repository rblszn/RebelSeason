import { clientIp, handle, ok, parseBody, tooMany } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { createPosSession, registerDevice } from "@/lib/pos-auth";
import { verifyDeviceCredentials } from "@/lib/pos/staff";
import { deviceSignInSchema } from "@/lib/pos/validations";

/** Register this browser as a POS device (owner / manager email + password) and sign in. */
export const POST = handle(async (request: Request) => {
  const { email, password, deviceName } = await parseBody(request, deviceSignInSchema);
  const ipOk = (await rateLimit({ key: `pos-device-ip:${clientIp(request)}`, limit: 10, windowSeconds: 900 })).success;
  const emailOk = (await rateLimit({ key: `pos-device-email:${email}`, limit: 10, windowSeconds: 900 })).success;
  if (!ipOk || !emailOk) throw tooMany("Too many sign-in attempts. Please wait 15 minutes and try again.");

  const user = await verifyDeviceCredentials(email, password);
  const device = await registerDevice(deviceName, user.id);
  await createPosSession(user.id, device.id);
  return ok({ device: { id: device.id, name: device.name } });
});
