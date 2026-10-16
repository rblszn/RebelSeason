import { notFound } from "next/navigation";
import { AppError } from "@/lib/api";
import { listPinStaff } from "@/lib/pos-auth";
import { getBill } from "@/lib/pos/bill";
import { formatStoreAddress, getStoreSettings } from "@/lib/pos/settings";
import { BillDocument } from "@/components/pos/bill-document";
import { BillActions } from "./bill-actions";

export const metadata = { title: "Bill" };

export default async function PosBillPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string; emailed?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [bill, settings, staff] = await Promise.all([
    getBill(id).catch((e) => {
      if (e instanceof AppError && e.status === 404) notFound();
      throw e;
    }),
    getStoreSettings(),
    listPinStaff(),
  ]);

  return (
    <div className="space-y-4">
      {/* A4 with comfortable margins when printed from the browser */}
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <BillActions
        bill={{ id: bill.id, billNumber: bill.billNumber, total: bill.total, email: bill.customer.email, cancelled: bill.status === "CANCELLED", canCancel: bill.registerOpen }}
        justCreated={sp.new === "1"}
        emailed={sp.emailed === "1"}
        approvers={staff.filter((s) => s.role !== "CASHIER")}
      />
      <BillDocument
        bill={bill}
        store={{ storeName: settings.storeName, address: formatStoreAddress(settings), phone: settings.phone, email: settings.email, gstin: settings.gstin, billFooter: settings.billFooter }}
      />
    </div>
  );
}
