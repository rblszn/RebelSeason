import { ok, parseBody } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { revalidateCatalog } from "@/lib/cache";
import { adjustStockSchema } from "@/lib/pos/validations";
import { adjustStock } from "@/lib/pos/stock";

/** Correct stock with a reason (damaged, gift, sample, lost, found ...). Logged in stock history. */
export const POST = adminRoute(async (admin, request: Request) => {
  const input = await parseBody(request, adjustStockSchema);
  await adjustStock(admin.userId, input);
  revalidateCatalog();
  return ok({ success: true });
});
