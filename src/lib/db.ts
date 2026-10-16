import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** A transaction client (inside prisma.$transaction). */
export type Tx = Prisma.TransactionClient;
/** Either the normal client or a transaction client, so helpers work in both. */
export type Db = PrismaClient | Tx;
