import { prisma } from "@/lib/db";
import { OrderStatus, Prisma } from "@prisma/client";

export const orderInclude = {
  // Never select the whole user row here: these orders are passed to client
  // components and would leak the password hash into the page payload.
  customer: { select: { id: true, name: true, email: true, phone: true } },
  items: true,
  payment: true,
} satisfies Prisma.OrderInclude;

export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export interface GetOrdersOptions {
  limit?: number;
  skip?: number;
  status?: OrderStatus;
  customerId?: string;
  /** Matches order number, customer name/email/phone or Razorpay payment/order id. */
  search?: string;
  orderBy?: Prisma.OrderOrderByWithRelationInput;
}

function orderWhere(options?: GetOrdersOptions): Prisma.OrderWhereInput {
  const { status, customerId } = options || {};
  const search = options?.search?.trim();
  return {
    ...(status ? { status } : {}),
    ...(customerId ? { customerId } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { customerName: { contains: search, mode: "insensitive" } },
            { customerEmail: { contains: search, mode: "insensitive" } },
            { customerPhone: { contains: search } },
            { payment: { razorpayPaymentId: { equals: search } } },
            { payment: { razorpayOrderId: { equals: search } } },
          ],
        }
      : {}),
  };
}

/**
 * Fetch all orders with customer, items, and payment details.
 */
export async function getAllOrders(
  options?: GetOrdersOptions
): Promise<OrderWithRelations[]> {
  const { limit, skip, orderBy } = options || {};

  return prisma.order.findMany({
    where: orderWhere(options),
    include: orderInclude,
    orderBy: orderBy || { createdAt: "desc" },
    ...(skip !== undefined ? { skip } : {}),
    ...(limit !== undefined ? { take: limit } : {}),
  });
}

/**
 * Get total count of orders for pagination.
 */
export async function getOrdersCount(
  options?: GetOrdersOptions
): Promise<number> {
  return prisma.order.count({
    where: orderWhere(options),
  });
}

/**
 * Fetch an order by its unique ID.
 */
export async function getOrderById(
  id: string
): Promise<OrderWithRelations | null> {
  return prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });
}

/**
 * Fetch an order by its order number (e.g., 'RS-10001').
 */
export async function getOrderByOrderNumber(
  orderNumber: string
): Promise<OrderWithRelations | null> {
  return prisma.order.findUnique({
    where: { orderNumber },
    include: orderInclude,
  });
}

/**
 * Fetch all orders placed by a specific customer.
 */
export async function getOrdersByCustomer(
  customerId: string,
  options?: { limit?: number; skip?: number }
): Promise<OrderWithRelations[]> {
  return prisma.order.findMany({
    where: { customerId },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
    ...(options?.skip !== undefined ? { skip: options.skip } : {}),
    ...(options?.limit !== undefined ? { take: options.limit } : {}),
  });
}
