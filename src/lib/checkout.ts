import { z } from "zod";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { getRazorpay } from "@/lib/razorpay";
import { MAX_QTY_PER_LINE, shippingFor } from "@/lib/pricing";
import { sendOrderConfirmationEmail } from "@/lib/mail";
import { revalidateCatalog } from "@/lib/cache";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export const cartItemSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullish(),
  quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE),
});

export const cartSchema = z.array(cartItemSchema).min(1).max(50);

export const addressSchema = z.object({
  id: z.string().max(64).optional(),
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().max(20).optional().default(""),
  street: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().trim().regex(/^\d{6}$/, "PIN code must be 6 digits"),
});

export type CartInput = z.infer<typeof cartSchema>;

// ---------------------------------------------------------------------------
// Pricing (always from the database, never from the client)
// ---------------------------------------------------------------------------

export interface PricedLine {
  productId: string;
  variantId: string | null;
  variantName: string | null;
  name: string;
  image: string | null;
  unitPrice: number;
  mrp: number;
  quantity: number;
}

export type PricingResult =
  | { ok: true; lines: PricedLine[]; subtotal: number; mrpTotal: number }
  | { ok: false; error: string; productId?: string };

export async function priceCart(items: CartInput): Promise<PricingResult> {
  // Merge duplicate lines so stock checks see the real requested quantity.
  const merged = new Map<string, { productId: string; variantId: string | null; quantity: number }>();
  for (const item of items) {
    const key = `${item.productId}:${item.variantId ?? ""}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += item.quantity;
    else merged.set(key, { productId: item.productId, variantId: item.variantId ?? null, quantity: item.quantity });
  }

  const productIds = [...new Set([...merged.values()].map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true, name: true, price: true, originalPrice: true, images: true, stock: true, hasVariants: true,
      variants: { select: { id: true, size: true, stock: true } },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: PricedLine[] = [];
  for (const line of merged.values()) {
    const product = byId.get(line.productId);
    if (!product) {
      return { ok: false, error: "A product in your cart is no longer available. Please remove it and try again.", productId: line.productId };
    }

    let variantName: string | null = null;
    let available = product.stock;
    if (product.hasVariants) {
      const variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant) {
        return { ok: false, error: `Please re-select a size for ${product.name}.`, productId: product.id };
      }
      variantName = variant.size;
      available = variant.stock;
    } else if (line.variantId) {
      return { ok: false, error: `Please re-add ${product.name} to your cart.`, productId: product.id };
    }

    if (available < line.quantity) {
      const label = variantName ? `${product.name} (${variantName})` : product.name;
      return {
        ok: false,
        error: available > 0 ? `Only ${available} left of ${label}.` : `${label} is out of stock.`,
        productId: product.id,
      };
    }

    lines.push({
      productId: product.id,
      variantId: product.hasVariants ? line.variantId : null,
      variantName,
      name: product.name,
      image: product.images[0] ?? null,
      unitPrice: product.price,
      mrp: product.originalPrice && product.originalPrice > product.price ? product.originalPrice : product.price,
      quantity: line.quantity,
    });
  }

  return {
    ok: true,
    lines,
    subtotal: lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    mrpTotal: lines.reduce((sum, l) => sum + l.mrp * l.quantity, 0),
  };
}

// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

export type CouponResult =
  | { ok: true; couponId: string; code: string; name: string; discount: number }
  | { ok: false; error: string };

export async function evaluateCoupon(
  rawCode: string,
  totals: { subtotal: number; mrpTotal: number },
  userId: string | null
): Promise<CouponResult> {
  const code = rawCode.toUpperCase().trim();
  if (!code || code.length > 50) return { ok: false, error: "Invalid coupon code" };

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    include: {
      _count: { select: { redemptions: true } },
      // One query covers the global limit and this customer's previous use.
      redemptions: { where: { userId: userId ?? "" }, select: { id: true }, take: 1 },
    },
  });

  if (!coupon) return { ok: false, error: "Invalid coupon code" };
  if (!coupon.isActive) return { ok: false, error: "This coupon is no longer active" };
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return { ok: false, error: "This coupon has expired" };
  if (coupon.maxLimit > 0 && coupon._count.redemptions >= coupon.maxLimit) {
    return { ok: false, error: "This coupon has reached its usage limit" };
  }
  if (coupon.redemptions.length > 0) {
    return { ok: false, error: "You have already used this coupon" };
  }

  const base = coupon.appliesTo === "MRP" ? totals.mrpTotal : totals.subtotal;
  let discount = coupon.type === "PERCENTAGE" ? Math.floor((base * coupon.value) / 100) : coupon.value;
  discount = Math.max(0, Math.min(discount, totals.subtotal));

  return { ok: true, couponId: coupon.id, code: coupon.code, name: coupon.name, discount };
}

// ---------------------------------------------------------------------------
// Order creation
// ---------------------------------------------------------------------------

export interface CreateOrderInput {
  userId: string;
  name: string;
  email: string;
  phone: string;
  items: CartInput;
  address: z.infer<typeof addressSchema>;
  couponCode?: string | null;
  expectedTotal?: number;
}

export type CreateOrderResult =
  | { ok: true; orderId: string; razorpayOrderId: string; amountPaise: number; total: number }
  | {
      ok: false;
      status: number;
      error: string;
      code?: string;
      productId?: string;
      total?: number;
      prices?: { productId: string; variantId: string | null; price: number }[];
    };

export async function createPendingOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const pricing = await priceCart(input.items);
  if (!pricing.ok) return { ok: false, status: 409, error: pricing.error, code: "CART_INVALID", productId: pricing.productId };

  let discount = 0;
  let couponCode: string | null = null;
  if (input.couponCode) {
    const coupon = await evaluateCoupon(input.couponCode, pricing, input.userId);
    if (!coupon.ok) return { ok: false, status: 400, error: coupon.error, code: "COUPON_INVALID" };
    discount = coupon.discount;
    couponCode = coupon.code;
  }

  const shipping = shippingFor(pricing.subtotal);
  const total = pricing.subtotal - discount + shipping;
  if (total < 1) {
    return { ok: false, status: 400, error: "Order total must be at least ₹1." };
  }

  // Prices changed since the item was added to the cart: make the customer
  // confirm the new amount rather than silently charging something different.
  if (typeof input.expectedTotal === "number" && input.expectedTotal !== total) {
    return {
      ok: false,
      status: 409,
      error: `Prices in your cart have changed. Your new total is ₹${total.toLocaleString("en-IN")}.`,
      code: "PRICE_CHANGED",
      total,
      prices: pricing.lines.map((l) => ({ productId: l.productId, variantId: l.variantId, price: l.unitPrice })),
    };
  }

  const orderNumber = `RS-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;
  const amountPaise = total * 100;

  const rzpOrder = await getRazorpay().orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: orderNumber,
    notes: { orderNumber },
  });

  const { id, ...shippingAddress } = input.address;
  void id;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerId: input.userId,
      customerName: input.address.name || input.name,
      customerEmail: input.email,
      customerPhone: input.phone,
      subtotal: pricing.subtotal,
      discount,
      shipping,
      total,
      status: "PENDING",
      shippingAddress: { ...shippingAddress, phone: shippingAddress.phone || input.phone },
      couponCode,
      items: {
        create: pricing.lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          variantName: l.variantName,
          name: l.name,
          quantity: l.quantity,
          price: l.unitPrice,
          image: l.image,
        })),
      },
      payment: {
        create: {
          amount: total,
          currency: "INR",
          method: "ONLINE",
          status: "UNPAID",
          razorpayOrderId: rzpOrder.id,
        },
      },
    },
    select: { id: true },
  });

  return { ok: true, orderId: order.id, razorpayOrderId: rzpOrder.id, amountPaise, total };
}

// ---------------------------------------------------------------------------
// Payment completion (shared by the checkout callback and the webhook)
// ---------------------------------------------------------------------------

export type FinalizeResult =
  | { status: "confirmed" | "already_confirmed"; orderId: string; customerId: string }
  | { status: "not_found" | "amount_mismatch" | "not_paid" };

/**
 * Confirms the order behind a Razorpay order id. Idempotent: the payment row
 * is claimed with a conditional update, so concurrent calls from the browser
 * callback and the webhook confirm the order, decrement stock and send the
 * email exactly once.
 */
export async function finalizePaidOrder(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  /** Amount Razorpay reports for the payment. Checked against what we charged. */
  amountPaise: number;
}): Promise<FinalizeResult> {
  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: params.razorpayOrderId },
    select: { id: true, amount: true, status: true, orderId: true, order: { select: { customerId: true } } },
  });
  if (!payment) return { status: "not_found" };
  if (payment.status === "CAPTURED") {
    return { status: "already_confirmed", orderId: payment.orderId, customerId: payment.order.customerId };
  }
  if (params.amountPaise !== payment.amount * 100) {
    console.error(
      `[payments] amount mismatch for ${params.razorpayOrderId}: paid ${params.amountPaise}, expected ${payment.amount * 100}`
    );
    return { status: "amount_mismatch" };
  }

  const outcome = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ["UNPAID", "FAILED"] } },
      data: {
        status: "CAPTURED",
        razorpayPaymentId: params.razorpayPaymentId,
        capturedAt: new Date(),
        failedAt: null,
        failureReason: null,
      },
    });
    if (claimed.count === 0) return "already_confirmed" as const;

    const order = await tx.order.update({
      where: { id: payment.orderId },
      data: { status: "CONFIRMED" },
      select: { couponCode: true, customerId: true, items: { select: { productId: true, variantId: true, quantity: true } } },
    });

    for (const item of order.items) {
      // Never let stock go negative. If two customers paid for the last unit
      // at the same moment, clamp to zero and flag it for the admin.
      if (item.variantId) {
        const res = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (res.count === 0) {
          await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: 0 } });
          console.warn(`[payments] oversold variant ${item.variantId} on order ${payment.orderId}`);
        }
      } else if (item.productId) {
        const res = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (res.count === 0) {
          await tx.product.updateMany({ where: { id: item.productId }, data: { stock: 0 } });
          console.warn(`[payments] oversold product ${item.productId} on order ${payment.orderId}`);
        }
      }
    }

    if (order.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: order.couponCode }, select: { id: true } });
      if (coupon) {
        await tx.couponRedemption.createMany({
          data: [{ couponId: coupon.id, userId: order.customerId, orderId: payment.orderId }],
          skipDuplicates: true,
        });
      }
    }
    return "confirmed" as const;
  });

  if (outcome === "confirmed") {
    revalidateCatalog("max");
    // Send the email after the response so the customer isn't kept waiting.
    after(async () => {
      try {
        const full = await prisma.order.findUnique({
          where: { id: payment.orderId },
          include: { items: true, payment: true },
        });
        if (full) await sendOrderConfirmationEmail(full.customerEmail, full);
      } catch (e) {
        console.error("Failed to send order confirmation email:", e);
      }
    });
  }

  return { status: outcome, orderId: payment.orderId, customerId: payment.order.customerId };
}

/**
 * Looks the payment up on Razorpay, captures it if the account is set to
 * manual capture, then confirms the order. Used by the checkout callback so
 * we never trust amounts or statuses sent from the browser.
 */
export async function confirmPaymentWithRazorpay(razorpayOrderId: string, razorpayPaymentId: string): Promise<FinalizeResult> {
  const razorpay = getRazorpay();
  let rzpPayment = await razorpay.payments.fetch(razorpayPaymentId);

  if (rzpPayment.order_id !== razorpayOrderId) return { status: "not_paid" };

  if (rzpPayment.status === "authorized") {
    rzpPayment = await razorpay.payments.capture(razorpayPaymentId, Number(rzpPayment.amount), "INR");
  }
  if (rzpPayment.status !== "captured") return { status: "not_paid" };

  return finalizePaidOrder({ razorpayOrderId, razorpayPaymentId, amountPaise: Number(rzpPayment.amount) });
}

export async function markPaymentFailed(razorpayOrderId: string, reason: string | undefined) {
  await prisma.payment.updateMany({
    where: { razorpayOrderId, status: "UNPAID" },
    data: { status: "FAILED", failedAt: new Date(), failureReason: reason?.slice(0, 500) ?? null },
  });
}
