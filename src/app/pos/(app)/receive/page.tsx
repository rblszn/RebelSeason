import { requirePosPage } from "@/lib/pos-auth";
import { ReceiveStock } from "./receive-stock";

export const metadata = { title: "Receive stock" };

export default async function ReceiveStockPage() {
  await requirePosPage("MANAGER");
  return <ReceiveStock />;
}
