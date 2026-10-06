// Shared by the browser and the server so both compute shipping identically.
// The server is always the source of truth for what a customer is charged.

export const FREE_SHIPPING_THRESHOLD = 2000;
export const SHIPPING_FEE = 100;
export const MAX_QTY_PER_LINE = 10;

export function shippingFor(subtotal: number): number {
  return subtotal > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
