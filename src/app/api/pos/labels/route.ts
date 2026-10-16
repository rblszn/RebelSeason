import { badRequest, forbidden, handle, parseBody } from "@/lib/api";
import { getAdminSession } from "@/lib/auth";
import { atLeast, getPosSession } from "@/lib/pos-auth";
import { labelItemsSchema } from "@/lib/pos/validations";
import { buildLabelsPdf, buildTestSheetPdf, labelsForItems, labelsForScope, type LabelMode } from "@/lib/pos/labels";

export const dynamic = "force-dynamic";

/** Labels: POS managers / owner, or the owner signed in to the admin panel. */
async function requireLabelAccess() {
  const pos = await getPosSession();
  if (pos && atLeast(pos.staff.role, "MANAGER")) return;
  const admin = await getAdminSession();
  if (admin.isLoggedIn && admin.role === "ADMIN") return;
  throw forbidden("Only a manager or the owner can print labels");
}

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

const SCOPES = ["department", "category", "product"] as const;

/**
 * GET ?scope=department|category|product&id=...&mode=stock|one&startAt=1&guides=1
 *   -> labels for a whole department / category / product.
 * GET ?test=1 -> one-page alignment test.
 */
export const GET = handle(async (request: Request) => {
  await requireLabelAccess();
  const sp = new URL(request.url).searchParams;
  if (sp.get("test")) return pdfResponse(await buildTestSheetPdf(), "rebel-label-test.pdf");

  const scope = sp.get("scope") as (typeof SCOPES)[number];
  const id = sp.get("id")?.trim();
  if (!SCOPES.includes(scope) || !id) throw badRequest("Choose a department, category or product");
  const mode: LabelMode = sp.get("mode") === "one" ? "one" : "stock";
  const items = await labelsForScope(scope, id, mode);
  const pdf = await buildLabelsPdf(items, { startAt: Number(sp.get("startAt")) || 1, guides: sp.get("guides") !== "0" });
  return pdfResponse(pdf, `rebel-labels-${scope}-${new Date().toISOString().slice(0, 10)}.pdf`);
});

/** POST { lines: [{ barcode, quantity }], startAt?, guides? } -> labels for exactly these. */
export const POST = handle(async (request: Request) => {
  await requireLabelAccess();
  const { lines, startAt, guides } = await parseBody(request, labelItemsSchema);
  const pdf = await buildLabelsPdf(await labelsForItems(lines), { startAt, guides });
  return pdfResponse(pdf, `rebel-labels-${new Date().toISOString().slice(0, 10)}.pdf`);
});
