import { getCustomerSession } from "@/lib/auth";
import CheckoutClient from "./CheckoutClient";

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const session = await getCustomerSession();

  const serializedSession = {
    userId: session.userId ?? "",
    email: session.email ?? "",
    name: session.name ?? "",
    isLoggedIn: Boolean(session.isLoggedIn && session.userId),
  };

  return (
    <CheckoutClient session={serializedSession} />
  );
}
