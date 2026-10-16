import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { removeSupplierBarcode } from "@/lib/pos/stock";

export const DELETE = adminRoute(async (_admin, _request: Request, ctx: { params: Promise<{ id: string; barcodeId: string }> }) => {
  const { id, barcodeId } = await ctx.params;
  await removeSupplierBarcode(id, barcodeId);
  return ok({ success: true });
});
