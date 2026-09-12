import { getOrderById } from '@/lib/dal/orders';
import OrderFailedClient from './OrderFailedClient';

export default async function OrderFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const id = params?.id;
  
  let serializedOrder = null;

  if (id) {
    const order = await getOrderById(id);
    
    if (order) {
      serializedOrder = {
        ...order,
        total: Number(order.total),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };
    }
  }

  return <OrderFailedClient order={serializedOrder} />;
}
