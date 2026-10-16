import { getOpenRegister, listRegisterSessions, registerSummary } from "@/lib/pos/register";
import { RegisterPanel } from "./register-panel";

export const metadata = { title: "Open / close the day" };

export default async function RegisterPage() {
  const [open, recent] = await Promise.all([getOpenRegister(), listRegisterSessions(7)]);
  const summary = open ? await registerSummary(open.id) : null;
  const lastClosed = recent.find((r) => r.closedAt);
  return <RegisterPanel summary={summary} openedBy={open?.openedBy.name ?? null} lastCounted={lastClosed?.countedCash ?? null} recent={recent} />;
}
