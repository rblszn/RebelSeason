import { getCustomerSession } from "@/lib/auth";
import CheckoutClient from "./CheckoutClient";

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const session = await getCustomerSession();

  return (
    <CheckoutClient session={session} />
  );
}
