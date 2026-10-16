import { handle } from "./api";
import { requirePos, type PosRole } from "./pos-auth";

type PosSessionInfo = Awaited<ReturnType<typeof requirePos>>;

/**
 * Wrap a POS route handler: requires an unlocked POS session with at least `min` role
 * (on a registered device) before the handler runs. Errors map to JSON like `handle()`.
 */
export function posRoute<A extends unknown[]>(min: PosRole, fn: (session: PosSessionInfo, ...args: A) => Promise<Response>) {
  return handle(async (...args: A) => {
    const session = await requirePos(min);
    return fn(session, ...args);
  });
}
