import { after } from "next/server";
import { ok, parseBody } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { closeRegisterSchema } from "@/lib/pos/validations";
import { closeRegister } from "@/lib/pos/register";
import { sendDayCloseEmail } from "@/lib/mail";
import { getStoreSettings } from "@/lib/pos/settings";
import { siteConfig } from "@/lib/site-config";

/** Close the day: record counted cash vs expected, and email the summary to the owner. */
export const POST = posRoute("CASHIER", async (session, request: Request) => {
  const { countedCash, note } = await parseBody(request, closeRegisterSchema);
  const summary = await closeRegister(session.staff.id, countedCash, note);
  after(async () => {
    const settings = await getStoreSettings();
    const to = settings.email || siteConfig.supportEmail;
    if (to) await sendDayCloseEmail(to, { ...summary, closedBy: session.staff.name });
  });
  return ok({ summary });
});
