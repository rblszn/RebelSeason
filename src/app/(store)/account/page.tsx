import { getCustomerSession } from "@/lib/auth";
import { getOrdersByCustomer } from "@/lib/dal/orders";
import { redirect } from "next/navigation";
import { AccountClient } from "./AccountClient";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await getCustomerSession();
  
  if (!session.isLoggedIn) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId as string },
    select: { phone: true }
  });

  const orders = await getOrdersByCustomer(session.userId as string);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full flex-1">
      <h1 className="font-heading text-4xl font-normal mb-12">My Account</h1>
      <p className="text-muted-foreground mb-8">Welcome back, {session.name}!</p>
      <AccountClient session={{ name: session.name as string, email: session.email as string, phone: user?.phone || "" }} orders={orders} />
    </div>
  );
}
