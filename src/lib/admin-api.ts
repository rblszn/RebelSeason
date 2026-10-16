import { handle, unauthorized } from "@/lib/api";
import { getAdminSession } from "@/lib/auth";

export type AdminInfo = { userId: string };

/**
 * Wrap an admin route handler. The proxy already blocks /api/admin for anyone who isn't signed
 * in as the owner; this checks again (so a route is safe even if the proxy changes) and hands the
 * owner's id to the handler, e.g. to record who changed stock.
 */
export function adminRoute<A extends unknown[]>(fn: (admin: AdminInfo, ...args: A) => Promise<Response>) {
  return handle(async (...args: A) => {
    const session = await getAdminSession();
    if (!session.isLoggedIn || session.role !== "ADMIN" || !session.userId) throw unauthorized("Admin access required");
    return fn({ userId: session.userId }, ...args);
  });
}
