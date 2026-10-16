import { ok, parseBody } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { storeSettingsSchema } from "@/lib/pos/validations";
import { getStoreSettings, updateStoreSettings } from "@/lib/pos/settings";

export const dynamic = "force-dynamic";

export const GET = adminRoute(async () => ok({ settings: await getStoreSettings() }));

/** Store details printed on shop bills. */
export const PUT = adminRoute(async (_admin, request: Request) => {
  const input = await parseBody(request, storeSettingsSchema);
  return ok({ settings: await updateStoreSettings(input) });
});
