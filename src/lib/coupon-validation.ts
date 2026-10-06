// Shared validation for admin coupon create/update requests.
export function validateCoupon(input: { code?: unknown; type?: unknown; value?: unknown; maxLimit?: unknown; appliesTo?: unknown }): string | null {
  if (input.code !== undefined && (typeof input.code !== "string" || !/^[A-Za-z0-9_-]{2,50}$/.test(input.code.trim()))) {
    return "Code must be 2-50 letters, numbers, hyphens or underscores";
  }
  if (input.type !== undefined && input.type !== "PERCENTAGE" && input.type !== "FLAT") return "Invalid coupon type";
  if (input.appliesTo !== undefined && input.appliesTo !== null && input.appliesTo !== "" && input.appliesTo !== "CART_VALUE" && input.appliesTo !== "MRP") {
    return "Invalid coupon target";
  }
  if (input.value !== undefined) {
    const value = Number(input.value);
    if (!Number.isInteger(value) || value <= 0) return "Value must be a positive whole number";
    if (input.type === "PERCENTAGE" && value > 100) return "Percentage cannot exceed 100";
  }
  if (input.maxLimit !== undefined && input.maxLimit !== null && input.maxLimit !== "") {
    const limit = Number(input.maxLimit);
    if (!Number.isInteger(limit) || limit < 0) return "Usage limit must be 0 (unlimited) or more";
  }
  return null;
}
