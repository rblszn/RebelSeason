/** Shared POS types (server responses used by the client screens). Money is whole rupees. */

export type PosRoleType = "CASHIER" | "MANAGER" | "OWNER";
export type PaymentMethodType = "CASH" | "UPI" | "CARD";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card" };
export const POS_ROLE_LABELS: Record<PosRoleType, string> = { OWNER: "Owner", MANAGER: "Manager", CASHIER: "Cashier" };

/**
 * One sellable thing, as cached on the POS device for instant scanning: a size of a product,
 * or the product itself when it has no sizes. Identified everywhere by its barcode.
 */
export interface PosUnit {
  kind: "variant" | "product";
  /** Variant id (kind "variant") or product id (kind "product"). */
  id: string;
  productId: string;
  barcode: string;
  /** Supplier barcodes that also identify this unit. */
  codes: string[];
  name: string;
  size: string | null;
  price: number;
  mrp: number;
  stock: number;
  imageUrl: string | null;
}

export interface BillQuoteLine {
  barcode: string;
  name: string;
  size: string | null;
  imageUrl: string | null;
  unitPrice: number;
  unitMrp: number;
  quantity: number;
  /** Rupees off this whole line. */
  discount: number;
  /** After the line discount. */
  lineTotal: number;
  stock: number;
}

export interface BillQuote {
  lines: BillQuoteLine[];
  itemCount: number;
  /** Selling price x quantity, before any discount. */
  subtotal: number;
  /** Savings from selling below MRP (informational). */
  mrpSavings: number;
  couponCode: string | null;
  couponDiscount: number;
  couponError: string | null;
  /** Line discounts + bill discount. */
  manualDiscount: number;
  manualPercent: number;
  /** The signed-in staff member's limit. */
  maxDiscountPercent: number;
  needsApproval: boolean;
  total: number;
  stockIssues: string[];
}

export interface BillView {
  id: string;
  billNumber: string;
  status: "DELIVERED" | "CANCELLED" | string;
  createdAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  customer: { name: string | null; phone: string; email: string | null };
  cashier: string | null;
  approvedBy: string | null;
  items: { id: string; name: string; size: string | null; quantity: number; unitPrice: number; unitMrp: number; discount: number; lineTotal: number }[];
  subtotal: number;
  mrpSavings: number;
  couponCode: string | null;
  couponDiscount: number;
  manualDiscount: number;
  total: number;
  payments: { method: PaymentMethodType; amount: number; tendered: number | null; reference: string | null }[];
  registerOpen: boolean;
}

export interface StoreInfo {
  storeName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string | null;
  billFooter: string;
}
