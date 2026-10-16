import { ok, parseBody } from "@/lib/api";
import { adminRoute } from "@/lib/admin-api";
import { addSupplierBarcode } from "@/lib/pos/stock";
import { supplierBarcodeSchema } from "@/lib/pos/validations";
import { z } from "zod";

const schema = supplierBarcodeSchema.extend({ variantId: z.string().trim().min(1).max(50).optional() });

/** Link a supplier's barcode (EAN/UPC) to a size, or to the product when it has no sizes. */
export const POST = adminRoute(async (_admin, request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { code, variantId } = await parseBody(request, schema);
  return ok({ barcode: await addSupplierBarcode(id, { variantId }, code) }, { status: 201 });
});
