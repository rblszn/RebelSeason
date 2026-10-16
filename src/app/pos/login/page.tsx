import { redirect } from "next/navigation";
import { getPosDevice, getPosSession, listPinStaff } from "@/lib/pos-auth";
import { PosLogin } from "./pos-login";

export const metadata = { title: "Sign in" };

/** Only same-app POS paths are allowed as the post-login destination. */
function safeNext(next: string | undefined) {
  return next && /^\/pos(\/|$|\?)/.test(next) && !next.startsWith("//") ? next : "/pos";
}

export default async function PosLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNext(next);
  if (await getPosSession()) redirect(target);

  const device = await getPosDevice();
  const staff = device ? await listPinStaff() : [];
  return <PosLogin next={target} device={device ? { name: device.name } : null} staff={staff} />;
}
