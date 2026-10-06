import { getOrderById } from '@/lib/dal/orders';
import { getCustomerSession } from '@/lib/auth';
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

  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect('/login');
  }

  const order = await getOrderById(id);

  // Treat other customers' orders as not found rather than confirming they exist.
  if (!order || order.customerId !== session.userId) {
    notFound();
  }

  const serializedOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    subtotal: order.subtotal,
    shipping: order.shipping,
    discount: order.discount,
    total: order.total,
    couponCode: order.couponCode,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt.toISOString(),
    payment: order.payment
      ? { status: order.payment.status, razorpayPaymentId: order.payment.razorpayPaymentId }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      variantName: item.variantName,
      quantity: item.quantity,
      price: item.price,
      image: item.image,
    })),
  };

  return <OrderSuccessClient order={serializedOrder} />;
}
