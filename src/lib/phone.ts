import { z } from "zod";

/**
 * Indian mobile numbers are stored as the plain 10 digits ("9876543210"): no +91, no spaces,
 * no leading 0. The shop finds customers by this number, so every place that saves a phone
 * should run it through here first. Returns null when it isn't a valid mobile number.
 */
export function normalizePhone(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  const ten = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

/** Zod field: any common way of writing a mobile number in, the clean 10 digits out. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit mobile number" });
      return z.NEVER;
    }
    return phone;
  });
