import { prisma } from "@/lib/db";
import { Prisma, Role } from "@prisma/client";

export const customerInclude = {
  addresses: true,
  _count: {
    select: {
      orders: true,
      reviews: true,
    },
  },
} satisfies Prisma.UserInclude;

export type CustomerWithRelations = Prisma.UserGetPayload<{
  include: typeof customerInclude;
}>;

export interface GetCustomersOptions {
  limit?: number;
  skip?: number;
  search?: string;
  orderBy?: Prisma.UserOrderByWithRelationInput;
}

/**
 * Fetch all customers (users with role CUSTOMER) including their addresses and relation counts.
 */
export async function getAllCustomers(
  options?: GetCustomersOptions
): Promise<CustomerWithRelations[]> {
  const { limit, skip, search, orderBy } = options || {};

  return prisma.user.findMany({
    where: {
      role: Role.CUSTOMER,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: customerInclude,
    orderBy: orderBy || { createdAt: "desc" },
    ...(skip !== undefined ? { skip } : {}),
    ...(limit !== undefined ? { take: limit } : {}),
  });
}

/**
 * Get total count of customers for pagination.
 */
export async function getCustomersCount(
  options?: GetCustomersOptions
): Promise<number> {
  const { search } = options || {};

  return prisma.user.count({
    where: {
      role: Role.CUSTOMER,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
  });
}

/**
 * Fetch a customer by their unique ID.
 */
export async function getCustomerById(
  id: string
): Promise<CustomerWithRelations | null> {
  return prisma.user.findFirst({
    where: {
      id,
      role: Role.CUSTOMER,
    },
    include: customerInclude,
  });
}

/**
 * Fetch a customer by their email address.
 */
export async function getCustomerByEmail(
  email: string
): Promise<CustomerWithRelations | null> {
  return prisma.user.findFirst({
    where: {
      email,
      role: Role.CUSTOMER,
    },
    include: customerInclude,
  });
}

/**
 * Fetch any user by ID regardless of role.
 */
export async function getUserById(
  id: string
): Promise<CustomerWithRelations | null> {
  return prisma.user.findUnique({
    where: { id },
    include: customerInclude,
  });
}
