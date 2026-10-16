import { handle, ok } from "@/lib/api";
import { endPosSession } from "@/lib/pos-auth";

/** Lock the POS (end the staff session; the device stays registered). */
export const POST = handle(async () => {
  await endPosSession();
  return ok({ success: true });
});
