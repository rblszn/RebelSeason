import { getStoreSettings } from "@/lib/pos/settings";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "POS settings | Admin" };

export default async function PosSettingsPage() {
  const s = await getStoreSettings();
  return (
    <div className="p-6">
      <PageHeader title="POS settings" description="Shop details printed on every in-store bill, and how bills are numbered." />
      <SettingsForm
        initial={{
          storeName: s.storeName,
          addressLine: s.addressLine,
          city: s.city,
          state: s.state,
          pincode: s.pincode,
          phone: s.phone,
          email: s.email,
          gstin: s.gstin ?? "",
          billFooter: s.billFooter,
          upiId: s.upiId ?? "",
          invoicePrefix: s.invoicePrefix,
        }}
      />
    </div>
  );
}
