import { revalidateTag } from "next/cache";

/** Tag attached to every cached storefront query (products, categories, settings). */
export const CATALOG_TAG = "catalog";

/** Safety net: cached catalog data is refreshed at least this often (seconds). */
export const CATALOG_REVALIDATE_SECONDS = 3600;

/**
 * Invalidate cached storefront data.
 * - "now": admin edits; the next visitor gets fresh data.
 * - "max": stock changes after a purchase; serve stale while refreshing in the
 *   background (checkout re-checks stock against the database anyway).
 */
export function revalidateCatalog(mode: "now" | "max" = "now") {
  try {
    revalidateTag(CATALOG_TAG, mode === "now" ? { expire: 0 } : "max");
  } catch (error) {
    console.error("Failed to revalidate catalog cache:", error);
  }
}
