import { revalidateTag } from "next/cache";

/** Tag attached to every cached storefront query (products, categories, settings). */
export const CATALOG_TAG = "catalog";

/**
 * Cached catalog data is refreshed at least this often (seconds). Kept short because
 * products can be scheduled to go live at a set time (the daily 8:30 AM drop), and the
 * storefront should pick that up within a minute of the release.
 */
export const CATALOG_REVALIDATE_SECONDS = 60;

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
