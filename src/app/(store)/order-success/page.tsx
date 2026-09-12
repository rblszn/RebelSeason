import { getOrderById } from '@/lib/dal/orders';
import OrderSuccessClient from './OrderSuccessClient';
import { notFound, redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const id = params?.id;
  
  if (!id) {
    redirect('/');
  }

  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  if (order.status === 'PENDING' || order.status === 'CANCELLED') {
    // Order not yet paid or was cancelled
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

  return <OrderSuccessClient order={serializedOrder} />;
}
