import { redirect } from "next/navigation";
import { getPosSession, POS_IDLE_MINUTES } from "@/lib/pos-auth";
import { PosShell } from "@/components/pos/pos-shell";

/** Every POS screen except sign-in: needs an unlocked staff session on a registered device. */
export default async function PosAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPosSession();
  if (!session) redirect("/pos/login");
  const { staff } = session;
  return (
    <PosShell
      user={{ id: staff.id, name: staff.name, role: staff.role, maxDiscountPercent: staff.maxDiscountPercent }}
      idleMinutes={POS_IDLE_MINUTES}
      deviceName={session.deviceName}
    >
      {children}
    </PosShell>
  );
}
