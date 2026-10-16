# Shop POS (in-store billing)

A billing counter for the physical shop at **`/pos`**, built the same way as the Ghero by Kajal Soni POS and sharing one stock with the website. It works on a phone or iPad (camera scanning) and on a computer (USB or Bluetooth scanner, or typing).

## Decisions

| Topic | Choice |
| --- | --- |
| Device | Phone or iPad first; also works on a computer |
| Barcodes | 8-digit numbers from `20000001`, never reused, printed as Code 128 |
| Labels | A4 sheet, 65 labels (5 x 13, 38.1 x 21.2 mm), plain paper or 65-up stickers |
| Taxes | Prices include all taxes. No GST lines on bills; a GSTIN prints if entered in POS settings |
| Customer phone | Required on every bill |
| Returns / exchanges | None. A manager can cancel a bill made by mistake, same day only |
| Receipts | A4 print (Save as PDF from the print dialog) and an automatic email when the customer gives an email |
| Staff | Owner (the admin account), Managers and Cashiers, each with a PIN |

## Setting it up

1. Deploy this version first. Older versions of the site don't know about phone-only customers or the new roles.
2. **Admin -> POS settings:** check the shop address, phone, email, UPI ID (shows a payment QR with the exact amount), bill footer and bill prefix (`RSS` gives `RSS/26-27/00001`, restarting each April).
3. **Admin -> Staff & devices:** set your own PIN, add managers and cashiers (name, role, PIN, discount limit). A manager given a password can also set up devices.
4. On the shop phone or iPad open `https://<site>/pos`, sign in once with the owner's admin email and password (or a manager's), and name the device. After that, staff just tap their name and enter their PIN.
5. Print labels: **Barcodes** in the POS, or the "Barcodes & labels" card on any product page in the admin. Print at 100% / Actual size.

## A normal day

1. **Open the day** with the cash in the drawer.
2. **New bill:** scan tags (the same tag again adds one more) or search by name. Enter the customer's phone. Add discounts or a coupon. Take payment: cash (shows change), UPI, card, or split.
3. Print or email the bill.
4. **Close the day:** count the cash. A difference needs a note. The owner gets a summary email.

Other POS screens: Today's bills, Stock check (scan a tag to see all sizes and whether it is on the website), Receive stock (managers, then print labels for exactly those pieces), Barcodes (managers).

## Rules

- One stock for the shop and the website. Selling, receiving, adjusting and cancelling all change the same number, and every change is listed in **Admin -> Stock history** with who, when and why.
- No overselling: taking stock is one atomic step that never goes below zero. If the shop sells the last piece while an online customer is paying, the online order is flagged on the dashboard ("paid online, but sold out in the shop first") for a refund or a call.
- A discount above the cashier's limit needs a manager's or the owner's PIN. The manager's own limit is checked too.
- 5 wrong PINs lock that PIN for 15 minutes. The POS locks itself after 10 idle minutes, and the server enforces that too.
- Cancelling an online order in the admin now puts its stock back. A cancelled order cannot be reopened.
- Products without sizes (bags, earrings) have their own barcode and stock; products with sizes have one barcode per size.

## What changed in the admin

- Dashboard: shop vs website sales today, cash in the drawer, refund alerts; revenue includes shop sales.
- Orders: All / Website / Shop tabs. A shop bill shows its items, discounts, payments, cashier and approver; its invoice is the same printable page.
- Customers: shop customers may have only a phone number. If they later sign up or check out online with that number, the two merge into one history.
- Reports: sales by day (shop vs website), payments, categories, best sellers, staff, stock on hand and slow movers, plus an Excel (CSV) export.
- Stock history, Staff & devices, POS settings (new pages under "Shop POS" in the menu).

## Technical notes

- Database: `order_items` gained `lineDiscount`; `orders` gained `channel` (ONLINE / POS), counter discount, cashier, approver, register day and cancellation fields; `users.email` and `users.password` are now optional; products and sizes got a `barcode` from the `barcode_seq` sequence. New tables: `staff_profiles`, `pos_devices`, `pos_sessions`, `register_sessions`, `store_settings`, `invoice_counters`, `order_payments`, `stock_movements`, `supplier_barcodes`.
- Shop bills are `Order` rows with channel `POS` and status `DELIVERED`. The customer's details are on the order and the shipping address holds the shop.
- Code: `src/lib/pos/*` (units, stock, bill, register, customer, labels, reports, staff, settings), `src/lib/pos-auth.ts` (device + PIN sessions, separate cookies from the website), `src/app/pos`, `src/app/api/pos`.
- Bills are priced on the server; the screen only sends barcodes, quantities, discounts and payments. Each bill carries an idempotency key, so a retry never bills twice.
- Not built (next release): returns and exchanges, gift vouchers, loyalty, WhatsApp bills, purchase orders, thermal printers, offline billing, GST breakup.
