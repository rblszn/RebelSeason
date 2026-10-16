import { after } from "next/server";
import { ok, parseBody } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { revalidateCatalog } from "@/lib/cache";
import { createBillSchema } from "@/lib/pos/validations";
import { createBill, getBill } from "@/lib/pos/bill";
import { sendPosBillEmail } from "@/lib/mail";
import { formatStoreAddress, getStoreSettings } from "@/lib/pos/settings";

/** Save a paid shop bill (stock drops for the website at the same moment). */
export const POST = posRoute("CASHIER", async (session, request: Request) => {
  const input = await parseBody(request, createBillSchema);
  const bill = await createBill(session, input);
  // The website shows stock from a short-lived cache; refresh it so a piece sold here stops showing there.
  revalidateCatalog("max");
  if (bill.emailTo) {
    const to = bill.emailTo;
    // Email the bill after responding, so the counter isn't kept waiting.
    after(async () => {
      const [view, s] = await Promise.all([getBill(bill.id), getStoreSettings()]);
      await sendPosBillEmail(to, view, { storeName: s.storeName, address: formatStoreAddress(s), phone: s.phone, billFooter: s.billFooter });
    });
  }
  return ok({ id: bill.id, billNumber: bill.billNumber, emailed: Boolean(bill.emailTo) }, { status: 201 });
});
