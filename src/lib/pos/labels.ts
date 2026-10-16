import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { prisma } from "@/lib/db";
import { badRequest } from "@/lib/api";
import { code128Bars, code128Modules } from "@/lib/barcode";
import { resolveUnits, unitProductSelect, unitsOf } from "@/lib/pos/units";
import type { PosUnit } from "@/lib/pos/types";

/**
 * Price-tag labels as an A4 PDF. One label per piece (or per size); each shows the product
 * name, size, price (and MRP when higher) and the unit's Code 128 barcode.
 *
 * Layout = the standard "65 labels per A4 sheet" grid (38.1 x 21.2 mm, 5 x 13), the most tags
 * that still scan reliably with a phone camera. It prints on plain paper (cut along the light
 * guide lines) and lines up with ready-made 65-up sticker sheets. Print at 100% / "Actual size".
 */

const MM = 72 / 25.4; // PDF points per millimetre
const A4 = { w: 210 * MM, h: 297 * MM };

export const LABEL_SHEET = {
  name: "A4 · 65 labels (38.1 × 21.2 mm)",
  perSheet: 65,
  cols: 5,
  rows: 13,
  labelW: 38.1,
  labelH: 21.2,
  left: 4.75, // page margin, mm
  top: 10.7,
  pitchX: 40.6, // label width + gap
  pitchY: 21.2,
} as const;

const PAD = 1.4; // mm inside each label
const MAX_MODULE = 0.33; // mm; wider bars scan more easily but must fit the label
const QUIET = 10; // modules of blank space each side of the bars (scanners need it)

export type LabelItem = {
  barcode: string;
  name: string;
  size: string | null;
  price: number;
  mrp: number;
};

/** pdf-lib's standard fonts only cover Latin-1; drop anything else (e.g. emoji, Devanagari). */
function latin1(text: string) {
  return text.replace(/₹/g, "Rs.").replace(/[^\x20-\x7e\xa0-\xff]/g, "").replace(/\s+/g, " ").trim();
}

const rupees = (n: number) => `Rs.${Math.round(n).toLocaleString("en-IN")}`;

/** Shorten `text` with an ellipsis until it fits `maxWidth` points. */
function fit(text: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, size) > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

function drawLabel(page: PDFPage, item: LabelItem, x0: number, yTop: number, fonts: { regular: PDFFont; bold: PDFFont }, guides: boolean) {
  const w = LABEL_SHEET.labelW * MM;
  const h = LABEL_SHEET.labelH * MM;
  const pad = PAD * MM;
  const inner = w - pad * 2;
  const ink = rgb(0, 0, 0);
  const grey = rgb(0.35, 0.35, 0.35);

  if (guides) {
    page.drawRectangle({ x: x0, y: yTop - h, width: w, height: h, borderColor: rgb(0.82, 0.82, 0.82), borderWidth: 0.3, borderDashArray: [2, 2] });
  }

  // Row 1: product name, MRP (struck through) on the right when it's higher than the price.
  const showMrp = item.mrp > item.price;
  const mrpText = showMrp ? `MRP ${rupees(item.mrp)}` : "";
  const mrpSize = 4.6;
  const mrpW = showMrp ? fonts.regular.widthOfTextAtSize(mrpText, mrpSize) : 0;
  const nameSize = 6;
  const row1 = yTop - pad - 4.4;
  page.drawText(fit(latin1(item.name), fonts.bold, nameSize, inner - mrpW - (showMrp ? 3 : 0)), { x: x0 + pad, y: row1, size: nameSize, font: fonts.bold, color: ink });
  if (showMrp) {
    const mx = x0 + w - pad - mrpW;
    page.drawText(mrpText, { x: mx, y: row1, size: mrpSize, font: fonts.regular, color: grey });
    const strikeFrom = mx + fonts.regular.widthOfTextAtSize("MRP ", mrpSize); // strike the amount only
    page.drawLine({ start: { x: strikeFrom, y: row1 + 1.7 }, end: { x: mx + mrpW, y: row1 + 1.7 }, thickness: 0.4, color: grey });
  }

  // Row 2: size, selling price.
  const priceText = rupees(item.price);
  const priceSize = 7.5;
  const priceW = fonts.bold.widthOfTextAtSize(priceText, priceSize);
  const row2 = row1 - 8;
  const variantText = latin1(item.size ? `Size ${item.size}` : "") || " ";
  page.drawText(fit(variantText, fonts.regular, 5.4, inner - priceW - 3), { x: x0 + pad, y: row2, size: 5.4, font: fonts.regular, color: ink });
  page.drawText(priceText, { x: x0 + w - pad - priceW, y: row2 - 0.3, size: priceSize, font: fonts.bold, color: ink });

  // Barcode, centred, as vector bars (sharp on any printer).
  const modules = code128Modules(item.barcode);
  const moduleMm = Math.min(MAX_MODULE, (LABEL_SHEET.labelW - PAD * 2) / (modules + QUIET * 2));
  const unit = moduleMm * MM;
  const barsW = modules * unit;
  const bx = x0 + (w - barsW) / 2;
  const barTop = row2 - 2.6;
  const barH = 9.5 * MM;
  for (const [x, bw] of code128Bars(item.barcode)) {
    page.drawRectangle({ x: bx + x * unit, y: barTop - barH, width: bw * unit, height: barH, color: ink });
  }

  // Row 3: the number (typed in if the bars get damaged), brand on the left.
  const codeSize = 5.6;
  const codeW = fonts.regular.widthOfTextAtSize(item.barcode, codeSize);
  const row3 = barTop - barH - 6;
  page.drawText(item.barcode, { x: x0 + (w - codeW) / 2, y: row3, size: codeSize, font: fonts.regular, color: ink });
  page.drawText("REBEL SEASON", { x: x0 + pad, y: row3, size: 3.6, font: fonts.bold, color: grey });
}

/**
 * Build the PDF. `startAt` (1-based) skips used positions on a partly used sticker sheet.
 * `guides` draws light cut lines around each label (for plain paper).
 */
export async function buildLabelsPdf(items: LabelItem[], options: { startAt?: number; guides?: boolean; title?: string } = {}) {
  if (!items.length) throw badRequest("There are no labels to print. Check that the items have stock, or choose one label per size.");
  if (items.length > 5000) throw badRequest("That's more than 5,000 labels. Please print a smaller selection.");
  const startAt = Math.min(Math.max(1, Math.floor(options.startAt ?? 1)), LABEL_SHEET.perSheet);
  const guides = options.guides ?? true;

  const doc = await PDFDocument.create();
  doc.setTitle(options.title ?? "Rebel Season price labels");
  doc.setCreator("Rebel Season POS");
  const fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };

  let page: PDFPage | null = null;
  let slot = startAt - 1;
  for (const item of items) {
    if (!page || slot >= LABEL_SHEET.perSheet) {
      if (page) slot = 0; // later sheets start at the first position
      page = doc.addPage([A4.w, A4.h]);
    }
    const col = slot % LABEL_SHEET.cols;
    const row = Math.floor(slot / LABEL_SHEET.cols);
    const x = (LABEL_SHEET.left + col * LABEL_SHEET.pitchX) * MM;
    const yTop = A4.h - (LABEL_SHEET.top + row * LABEL_SHEET.pitchY) * MM;
    drawLabel(page, item, x, yTop, fonts, guides);
    slot++;
  }
  return doc.save();
}

/** A one-page alignment test: an outline of every label position, numbered. */
export async function buildTestSheetPdf() {
  const doc = await PDFDocument.create();
  doc.setTitle("Rebel Season label test sheet");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([A4.w, A4.h]);
  for (let i = 0; i < LABEL_SHEET.perSheet; i++) {
    const col = i % LABEL_SHEET.cols;
    const row = Math.floor(i / LABEL_SHEET.cols);
    const x = (LABEL_SHEET.left + col * LABEL_SHEET.pitchX) * MM;
    const yTop = A4.h - (LABEL_SHEET.top + row * LABEL_SHEET.pitchY) * MM;
    page.drawRectangle({ x, y: yTop - LABEL_SHEET.labelH * MM, width: LABEL_SHEET.labelW * MM, height: LABEL_SHEET.labelH * MM, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
    page.drawText(String(i + 1), { x: x + 4, y: yTop - 12, size: 9, font });
  }
  page.drawText("Print at 100% (Actual size). Each box should match one label on the sticker sheet.", { x: 14, y: 12, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
  return doc.save();
}

// ---------------------------------------------------------------------------
// Choosing what to print
// ---------------------------------------------------------------------------

/** "stock" = one label per piece in stock; "one" = one label per size. */
export type LabelMode = "stock" | "one";

const toItem = (u: PosUnit): LabelItem => ({ barcode: u.barcode, name: u.name, size: u.size, price: u.price, mrp: u.mrp });

function expand(units: PosUnit[], mode: LabelMode) {
  return units.flatMap((u) => Array.from({ length: mode === "one" ? 1 : Math.max(0, u.stock) }, () => toItem(u)));
}

/** Labels for a whole department, one category, or one product, in catalogue order. */
export async function labelsForScope(scope: "department" | "category" | "product", id: string, mode: LabelMode) {
  const where =
    scope === "department" ? { category: { OR: [{ id }, { parentId: id }] } } : scope === "category" ? { categoryId: id } : { id };
  const products = await prisma.product.findMany({ where, orderBy: { name: "asc" }, select: unitProductSelect });
  return expand(products.flatMap(unitsOf), mode);
}

/** Labels for an explicit list, e.g. stock just received, or custom quantities per size. */
export async function labelsForItems(lines: { barcode: string; quantity: number }[]) {
  const units = await resolveUnits(prisma, lines.map((l) => l.barcode));
  return lines.flatMap((l) => {
    const u = units.get(l.barcode.trim());
    return u ? Array.from({ length: Math.max(0, Math.floor(l.quantity)) }, () => toItem(u)) : [];
  });
}

// ---------------------------------------------------------------------------
// Browsing for the Barcodes page (department > category > product)
// ---------------------------------------------------------------------------

const countSelect = { id: true, stock: true, hasVariants: true, variants: { select: { stock: true } } } as const;

function counts(p: { stock: number; hasVariants: boolean; variants: { stock: number }[] }) {
  const stocks = p.hasVariants ? p.variants.map((v) => v.stock) : [p.stock];
  return { units: stocks.length, pieces: stocks.reduce((s, n) => s + Math.max(0, n), 0) };
}

/** Every department with product / size / piece counts. */
export async function labelDepartments() {
  const [departments, products] = await Promise.all([
    prisma.category.findMany({ where: { parentId: null }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.product.findMany({ select: { ...countSelect, category: { select: { id: true, parentId: true } } } }),
  ]);
  return departments.map((d) => {
    const mine = products.filter((p) => p.category.id === d.id || p.category.parentId === d.id);
    const c = mine.reduce((acc, p) => ({ units: acc.units + counts(p).units, pieces: acc.pieces + counts(p).pieces }), { units: 0, pieces: 0 });
    return { id: d.id, name: d.name, products: mine.length, ...c };
  });
}

/** A department or category: its categories and its products, each with size / piece counts. */
export async function labelCategory(id: string) {
  const category = await prisma.category.findUnique({
    where: { id },
    select: { id: true, name: true, parentId: true, parent: { select: { id: true, name: true } }, children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } } },
  });
  if (!category) return null;

  const products = await prisma.product.findMany({
    where: { category: { OR: [{ id }, { parentId: id }] } },
    orderBy: { name: "asc" },
    select: { ...countSelect, name: true, categoryId: true, images: true },
  });
  const rows = products.map((p) => ({ id: p.id, name: p.name, categoryId: p.categoryId, imageUrl: p.images[0] ?? null, ...counts(p) }));
  const categories = category.children.map((c) => {
    const mine = rows.filter((p) => p.categoryId === c.id);
    return { ...c, products: mine.length, units: mine.reduce((n, p) => n + p.units, 0), pieces: mine.reduce((n, p) => n + p.pieces, 0) };
  });
  return { id: category.id, name: category.name, parent: category.parent, categories, products: rows };
}

/** One product's sizes with their barcodes, for custom label quantities. */
export async function labelProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    select: { ...unitProductSelect, category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } } },
  });
  if (!product) return null;
  return { id: product.id, name: product.name, category: product.category, units: unitsOf(product) };
}
