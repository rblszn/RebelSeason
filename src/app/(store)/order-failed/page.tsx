import { prisma } from '@/lib/db';
import { getCustomerSession } from '@/lib/auth';
import OrderFailedClient from './OrderFailedClient';

export const dynamic = 'force-dynamic';

export default async function OrderFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const id = params?.id;

  let order: { orderNumber: string } | null = null;

  if (id) {
    const session = await getCustomerSession();
    if (session.isLoggedIn && session.userId) {
      // Only reveal the order to the customer who placed it.
      order = await prisma.order.findFirst({
        where: { id, customerId: session.userId },
        select: { orderNumber: true },
      });
    }
  }

  return <OrderFailedClient order={order} />;
}
