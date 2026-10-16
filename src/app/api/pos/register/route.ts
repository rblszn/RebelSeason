import { ok, parseBody } from "@/lib/api";
import { posRoute } from "@/lib/pos-api";
import { openRegisterSchema } from "@/lib/pos/validations";
import { getOpenRegister, openRegister, registerSummary } from "@/lib/pos/register";

export const dynamic = "force-dynamic";

/** Is the day open? With the running totals when it is. */
export const GET = posRoute("CASHIER", async () => {
  const open = await getOpenRegister();
  return ok({ register: open ? await registerSummary(open.id) : null });
});

/** Open the day with the cash in the drawer. */
export const POST = posRoute("CASHIER", async (session, request: Request) => {
  const { openingCash } = await parseBody(request, openRegisterSchema);
  const register = await openRegister(session.staff.id, openingCash);
  return ok({ register: await registerSummary(register.id) }, { status: 201 });
});
