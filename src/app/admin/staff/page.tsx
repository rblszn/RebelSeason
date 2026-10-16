import { getAdminSession } from "@/lib/auth";
import { adminListStaff } from "@/lib/pos/staff";
import { PageHeader } from "@/components/admin/ui";
import { StaffManager } from "./staff-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff & devices | Admin" };

export default async function StaffPage() {
  const [session, data] = await Promise.all([getAdminSession(), adminListStaff()]);
  return (
    <div className="p-6">
      <PageHeader
        title="Staff & devices"
        description="Who can use the shop POS, their PINs and discount limits, and the phones / iPads set up as counters."
      />
      <StaffManager meId={session.userId ?? ""} staff={data.staff} devices={data.devices} />
    </div>
  );
}
