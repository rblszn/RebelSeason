import { handle, ok, unauthorized } from "@/lib/api";
import { getPosDevice, listPinStaff } from "@/lib/pos-auth";

/** Staff who can unlock this registered device with a PIN. */
export const GET = handle(async () => {
  const device = await getPosDevice();
  if (!device) throw unauthorized("This device isn't set up for the POS yet");
  return ok({ device: { id: device.id, name: device.name }, staff: await listPinStaff() });
});
