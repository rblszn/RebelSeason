import { ok, parseBody } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { revalidateCatalog } from "@/lib/cache";
import { receiveStockSchema } from "@/lib/pos/validations";
import { receiveStock } from "@/lib/pos/stock";

/** New stock arrived (manager / owner). Shop and website both see the new count. */
export const POST = posRoute("MANAGER", async (session, request: Request) => {
  const { lines, note } = await parseBody(request, receiveStockSchema);
  const result = await receiveStock(session.staff.id, lines, note);
  revalidateCatalog();
  return ok(result, { status: 201 });
});
