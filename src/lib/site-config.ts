import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "@/lib/pricing";

// Business details shown on the Contact and policy pages. Razorpay's website
// review checks these against the Udyam certificate and the Razorpay account,
// so keep them identical to what was submitted there.
export const siteConfig = {
  brandName: "The Rebel Season",
  // Proprietor and registered enterprise name, as on the Udyam certificate.
  proprietorName: "Riya Roopwani",
  registeredBusinessName: "The Rebel Season",
  legalName: "Riya Roopwani, proprietor of The Rebel Season",
  supportEmail: "rbl.szn@gmail.com",
  supportPhone: "+91 63778 45115",
  // Exactly as on the Udyam certificate / Razorpay activation form.
  registeredAddress: "FIRST FLOOR, SECTOR 3 100 FT ROAD, AZAD NAGAR, OPP HONEY DAAL BAATI, GIRWA, UDAIPUR - 313001",
  operationalAddress: "HANUMAN MANDIR K PAS, BADI NOKHA, SECT 4 HIRANMAGI, UDAIPUR, RAJASTHAN, 313002",
  // Courts with jurisdiction over disputes (stated in the Terms).
  courtsCity: "Udaipur, Rajasthan",
  supportHours: "Monday to Saturday, 10:00 AM – 6:00 PM IST",
  instagram: "https://www.instagram.com/rebel_seasonn/",

  // Policy terms used on the Shipping, Cancellation & Refund and Terms pages.
  policiesLastUpdated: "6 October 2026",
  // Estimated time from order confirmation to delivery.
  deliveryDays: "8–14 days",
  // Window to report a damaged, defective or wrong item (the only refund exception).
  damageReportHours: 48,
  // Time for an approved refund to reach the customer's original payment method.
  refundProcessingDays: "5–7 business days",
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  shippingFee: SHIPPING_FEE,
  jurisdiction: "India",
};
