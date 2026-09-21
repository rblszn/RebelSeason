import { getOrderById } from '@/lib/dal/orders';
import OrderDetailsClient from './OrderDetailsClient';
import { notFound, redirect } from 'next/navigation';
import { getCustomerSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AccountOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  if (!id) {
    redirect('/account');
  }

  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect('/login');
  }

  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  // Security Check: Ensure the order belongs to the logged-in user
  if (order.customerId !== session.userId) {
    redirect('/account');
  }

  // Serialize order for client component
  const serializedOrder = {
    ...order,
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((item: any) => ({
      ...item,
      price: Number(item.price),
      product: item.product ? {
        ...item.product,
        price: Number(item.product.price),
      } : undefined
    })),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <OrderDetailsClient order={serializedOrder} />
    </div>
  );
}
