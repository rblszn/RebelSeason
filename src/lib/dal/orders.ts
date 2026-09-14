import { prisma } from "@/lib/db";
import { OrderStatus, Prisma } from "@prisma/client";

export const orderInclude = {
  customer: true,
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
  orderBy?: Prisma.OrderOrderByWithRelationInput;
}

/**
 * Fetch all orders with customer, items, and payment details.
 */
export async function getAllOrders(
  options?: GetOrdersOptions
): Promise<OrderWithRelations[]> {
  const { limit, skip, status, customerId, orderBy } = options || {};

  return prisma.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
    },
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
  const { status, customerId } = options || {};

  return prisma.order.count({
    where: {
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
    },
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
