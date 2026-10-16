import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { revokeDevice } from "@/lib/pos/staff";

/** Remove a POS device (lost phone, old tablet). Anyone signed in on it is signed out. */
export const DELETE = adminRoute(async (_admin, _request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  await revokeDevice(id);
  return ok({ success: true });
});
