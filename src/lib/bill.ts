// One place that turns a stored order into the figures every bill shows
// (storefront, email, admin, invoice), so they can never disagree.

export interface BillLineInput {
  id?: string;
  name: string;
  variantName?: string | null;
  quantity: number;
  /** Unit price charged. */
  price: number;
  /** Unit original price (MRP) when bought. Null on orders placed before it was recorded. */
  mrp?: number | null;
}

export interface BillOrderInput {
  items: BillLineInput[];
  subtotal: number;
  /** Coupon discount. */
  discount: number;
  /** Discount given at the shop counter (shop bills only). */
  manualDiscount?: number;
  shipping: number;
  total: number;
  couponCode?: string | null;
}

export interface BillLine {
  id?: string;
  name: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  /** Original unit price; equal to unitPrice when the item was not on sale. */
  unitMrp: number;
  onSale: boolean;
  lineTotal: number;
  lineMrp: number;
}

export interface Bill {
  lines: BillLine[];
  /** Everything at original prices. */
  mrpTotal: number;
  /** Reduction from sale prices (MRP minus the price charged). */
  saleSavings: number;
  /** Items at the prices charged, before coupon and shipping. */
  subtotal: number;
  couponCode: string | null;
  couponDiscount: number;
  /** Discount given at the shop counter; 0 for website orders. */
  manualDiscount: number;
  shipping: number;
  total: number;
  /** Sale savings plus coupon and counter discounts. */
  totalSavings: number;
}

export function buildBill(order: BillOrderInput): Bill {
  const lines: BillLine[] = order.items.map((item) => {
    const onSale = typeof item.mrp === "number" && item.mrp > item.price;
    const unitMrp = onSale ? (item.mrp as number) : item.price;
    return {
      id: item.id,
      name: item.name,
      variantName: item.variantName ?? null,
      quantity: item.quantity,
      unitPrice: item.price,
      unitMrp,
      onSale,
      lineTotal: item.price * item.quantity,
      lineMrp: unitMrp * item.quantity,
    };
  });

  const subtotal = order.subtotal || lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const mrpTotal = Math.max(
    subtotal,
    lines.reduce((sum, l) => sum + l.lineMrp, 0)
  );
  const saleSavings = Math.max(0, mrpTotal - subtotal);
  const couponDiscount = Math.max(0, order.discount || 0);
  const manualDiscount = Math.max(0, order.manualDiscount || 0);

  return {
    lines,
    mrpTotal,
    saleSavings,
    subtotal,
    couponCode: order.couponCode || null,
    couponDiscount,
    manualDiscount,
    shipping: order.shipping || 0,
    total: order.total,
    totalSavings: saleSavings + couponDiscount + manualDiscount,
  };
}

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
