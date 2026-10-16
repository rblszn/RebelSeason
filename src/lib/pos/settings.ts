import { cache } from "react";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/site-config";
import type { StoreSettingsInput } from "@/lib/pos/validations";

/**
 * Store details printed on shop bills (single row). Until the owner edits them in
 * Admin -> POS settings, the row is created from the business details already on the website.
 */
export const getStoreSettings = cache(async () => {
  const existing = await prisma.storeSettings.findUnique({ where: { id: "store" } });
  if (existing) return existing;
  return prisma.storeSettings.upsert({
    where: { id: "store" },
    update: {},
    create: {
      id: "store",
      storeName: siteConfig.brandName,
      addressLine: siteConfig.operationalAddress,
      phone: siteConfig.supportPhone,
      email: siteConfig.supportEmail,
    },
  });
});

export async function updateStoreSettings(input: StoreSettingsInput) {
  return prisma.storeSettings.upsert({ where: { id: "store" }, update: input, create: { id: "store", ...input } });
}

/** One-line shop address for bills, e.g. "Shop 1, Market Road, Udaipur, Rajasthan 313001". */
export function formatStoreAddress(s: { addressLine: string; city: string; state: string; pincode: string }) {
  return [s.addressLine, s.city, [s.state, s.pincode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}
