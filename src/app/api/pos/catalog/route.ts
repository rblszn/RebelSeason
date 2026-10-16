import { ok } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { posCatalog } from "@/lib/pos/units";

export const dynamic = "force-dynamic";

/** All sellable items with barcodes; the POS caches this so scans resolve instantly. */
export const GET = posRoute("CASHIER", async () => ok({ units: await posCatalog(), fetchedAt: new Date().toISOString() }));
