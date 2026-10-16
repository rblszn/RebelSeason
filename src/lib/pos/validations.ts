import { z } from "zod";
import { phoneSchema } from "@/lib/phone";

/**
 * Validation for the in-store POS and its admin screens. Money is whole rupees; the server
 * recomputes every price and total, so the client only sends barcodes, quantities and discounts.
 */

const id = z.string().trim().min(1).max(50);
const barcode = z.string().trim().min(3).max(64);
const money = z.number().int("Use whole rupees").min(0).max(10_000_000);
export const pinSchema = z.string().regex(/^\d{4,6}$/, "PIN must be 4 to 6 digits");
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .transform((v) => v || null)
  .pipe(z.string().email("Enter a valid email").nullable())
  .optional()
  .nullable();

// --- Sign-in ----------------------------------------------------------------

export const deviceSignInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(200),
  deviceName: z.string().trim().min(1, "Name this device, e.g. Counter iPad").max(60),
});

export const pinSignInSchema = z.object({ staffId: id, pin: pinSchema });

export const approvalSchema = z.object({ staffId: id, pin: pinSchema }).optional();

// --- Billing ----------------------------------------------------------------

export const posCustomerSchema = z.object({
  phone: phoneSchema,
  name: z.string().trim().max(100).optional().nullable(),
  email: optionalEmail,
});

export const createBillSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(100),
  customer: posCustomerSchema,
  lines: z
    .array(
      z.object({
        barcode,
        quantity: z.number().int().min(1).max(999),
        discount: money.default(0), // rupees off this whole line
      })
    )
    .min(1, "Add at least one item")
    .max(200),
  billDiscount: money.default(0), // rupees off the bill
  couponCode: z.string().trim().toUpperCase().max(50).optional().nullable(),
  payments: z
    .array(
      z.object({
        method: z.enum(["CASH", "UPI", "CARD"]),
        amount: money.positive("Payment amount must be more than 0"),
        tendered: money.optional().nullable(), // cash handed over
        reference: z.string().trim().max(100).optional().nullable(),
      })
    )
    .min(1, "Add a payment")
    .max(5),
  approval: approvalSchema,
});

/** Same as a bill but without payments: the server prices it (coupon, limits) for the screen. */
export const quoteBillSchema = createBillSchema.omit({ idempotencyKey: true, payments: true }).extend({
  customer: z.object({ phone: z.string().trim().max(30).optional().nullable() }).optional(),
});

export const cancelBillSchema = z.object({
  reason: z.string().trim().min(3, "Say why the bill is cancelled").max(300),
  approval: approvalSchema,
});

export const emailBillSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email") });

// --- Register (cash drawer) -------------------------------------------------

export const openRegisterSchema = z.object({ openingCash: money });
export const closeRegisterSchema = z.object({
  countedCash: money,
  note: z.string().trim().max(500).optional().nullable(),
});

// --- Stock ------------------------------------------------------------------

export const receiveStockSchema = z.object({
  lines: z.array(z.object({ barcode, quantity: z.number().int().min(1).max(10_000) })).min(1, "Add at least one item").max(500),
  note: z.string().trim().max(300).optional().nullable(),
});

export const ADJUSTMENT_REASONS = ["Damaged", "Gift", "Photo-shoot sample", "Lost / theft", "Found", "Count correction", "Other"] as const;

export const adjustStockSchema = z.object({
  barcode,
  delta: z.number().int().min(-10_000).max(10_000).refine((v) => v !== 0, "Enter how many to add or remove"),
  reason: z.enum(ADJUSTMENT_REASONS),
  note: z.string().trim().max(300).optional().nullable(),
});

// --- Labels -----------------------------------------------------------------

export const labelItemsSchema = z.object({
  lines: z.array(z.object({ barcode, quantity: z.number().int().min(0).max(1000) })).min(1).max(1000),
  startAt: z.number().int().min(1).max(65).optional(),
  guides: z.boolean().optional(),
});

// --- Admin: staff & settings ------------------------------------------------

const staffRole = z.enum(["MANAGER", "CASHIER"]);
const discountLimit = z.number().int().min(0).max(100);

export const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: staffRole,
  pin: pinSchema,
  maxDiscountPercent: discountLimit,
  // Managers with a password can register new POS devices; leave empty to keep that to the owner.
  password: z.string().min(10, "Password must be at least 10 characters").max(200).optional().nullable(),
});

export const updateStaffSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  role: staffRole.optional(),
  pin: pinSchema.optional(),
  maxDiscountPercent: discountLimit.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(10, "Password must be at least 10 characters").max(200).optional().nullable(),
});

/** The owner's own PIN for the POS (the owner signs devices in with the admin password). */
export const ownerPinSchema = z.object({ pin: pinSchema });

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(1, "Store name is required").max(100),
  addressLine: z.string().trim().max(200),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
  pincode: z.string().trim().max(10),
  phone: z.string().trim().max(30),
  email: z.string().trim().max(200).refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email"),
  gstin: z.string().trim().toUpperCase().max(15).transform((v) => v || null).nullable().optional(),
  billFooter: z.string().trim().max(500),
  upiId: z
    .string()
    .trim()
    .max(100)
    .transform((v) => v || null)
    .refine((v) => !v || /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(v), "Enter a UPI ID like shopname@okbank")
    .nullable()
    .optional(),
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,8}$/, "Use 1-8 letters or digits"),
});

export const supplierBarcodeSchema = z.object({
  code: z.string().trim().min(3, "Barcode is too short").max(64).regex(/^[\x20-\x7e]+$/, "Barcode has unsupported characters"),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type QuoteBillInput = z.infer<typeof quoteBillSchema>;
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
