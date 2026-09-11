import { getCustomerSession } from "@/lib/auth";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage() {
  const session = await getCustomerSession();

  return (
    <CheckoutClient session={session} />
  );
}
