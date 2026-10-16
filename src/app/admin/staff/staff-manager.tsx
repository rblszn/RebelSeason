"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, Smartphone } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Card, Field, Pill, TableWrap, Toggle, inputCls, td, th } from "@/components/admin/ui";
import { api, errorMessage, fieldErrors } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { POS_ROLE_LABELS, type PosRoleType } from "@/lib/pos/types";

type Staff = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  posRole: PosRoleType;
  hasPassword: boolean;
  hasPin: boolean;
  maxDiscountPercent: number;
  isActive: boolean;
  pinLocked: boolean;
  billCount: number;
};
type Device = { id: string; name: string; registeredBy: string | null; createdAt: string; lastSeenAt: string; revoked: boolean };

type Form = { name: string; email: string; role: "MANAGER" | "CASHIER"; pin: string; maxDiscountPercent: string; password: string; isActive: boolean };
const blank: Form = { name: "", email: "", role: "CASHIER", pin: "", maxDiscountPercent: "10", password: "", isActive: true };

export function StaffManager({ meId, staff, devices }: { meId: string; staff: Staff[]; devices: Device[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [ownerPin, setOwnerPin] = useState("");
  const owner = staff.find((s) => s.id === meId);
  const team = staff.filter((s) => s.posRole !== "OWNER");

  const openNew = () => {
    setForm(blank);
    setErrors({});
    setEditing("new");
  };
  const openEdit = (s: Staff) => {
    setForm({ name: s.name ?? "", email: s.email ?? "", role: s.posRole === "MANAGER" ? "MANAGER" : "CASHIER", pin: "", maxDiscountPercent: String(s.maxDiscountPercent), password: "", isActive: s.isActive });
    setErrors({});
    setEditing(s);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setErrors({});
    try {
      const common = { name: form.name, role: form.role, maxDiscountPercent: Number(form.maxDiscountPercent), ...(form.role === "MANAGER" && form.password ? { password: form.password } : {}) };
      if (editing === "new") {
        await api("/api/admin/staff", { body: { ...common, email: form.email, pin: form.pin } });
        toast(`${form.name} added. They can now unlock the POS with their PIN.`);
      } else {
        await api(`/api/admin/staff/${editing.id}`, { method: "PATCH", body: { ...common, isActive: form.isActive, ...(form.pin ? { pin: form.pin } : {}) } });
        toast("Staff member updated");
      }
      setEditing(null);
      router.refresh();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const saveOwnerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/admin/staff/owner-pin", { method: "PUT", body: { pin: ownerPin } });
      setOwnerPin("");
      toast("Your POS PIN is set");
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  const revoke = async (d: Device) => {
    if (!confirm(`Remove "${d.name}" from the POS? Anyone signed in on it is signed out, and it must be set up again to be used.`)) return;
    try {
      await api(`/api/admin/pos-devices/${d.id}`, { method: "DELETE" });
      toast("Device removed");
      router.refresh();
    } catch (err) {
      toast(errorMessage(err), "error");
    }
  };

  return (
    <div className="space-y-6">
      {owner && (
        <Card title="Your POS access (owner)">
          <div className="flex flex-wrap items-end gap-6">
            <div className="text-sm text-gray-600 max-w-md">
              <p>Set up a new counter device at <b>/pos</b> with your admin email and password. Your PIN lets you unlock the POS quickly and approve bigger discounts or cancellations on a cashier&apos;s screen.</p>
              <p className="mt-1">{owner.hasPin ? <Pill tone="green">PIN set</Pill> : <Pill tone="amber">No PIN yet</Pill>}</p>
            </div>
            <form onSubmit={saveOwnerPin} className="flex items-end gap-2">
              <Field label={owner.hasPin ? "New PIN" : "Set a PIN"} htmlFor="owner-pin">
                <input id="owner-pin" inputMode="numeric" autoComplete="new-password" type="password" maxLength={6} value={ownerPin} onChange={(e) => setOwnerPin(e.target.value.replace(/\D/g, ""))} className={`${inputCls} w-32`} placeholder="4-6 digits" />
              </Field>
              <button type="submit" disabled={ownerPin.length < 4} className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-white px-3 py-2 text-sm disabled:opacity-50">
                <KeyRound className="w-4 h-4" /> Save PIN
              </button>
            </form>
          </div>
        </Card>
      )}

      <Card
        title={`Staff (${team.length})`}
        actions={
          <button onClick={openNew} className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-white px-3 py-2 text-sm">
            <Plus className="w-4 h-4" /> Add staff
          </button>
        }
      >
        {team.length === 0 ? (
          <p className="text-sm text-gray-500">No staff yet. Add your shop managers and cashiers with a PIN each.</p>
        ) : (
          <div className="-m-5">
            <TableWrap>
              <thead>
                <tr>
                  <th className={th}>Name</th>
                  <th className={th}>Role</th>
                  <th className={`${th} text-right`}>Discount limit</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Bills</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {team.map((s) => (
                  <tr key={s.id} className={s.isActive ? "" : "opacity-60"}>
                    <td className={td}>
                      {s.name}
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </td>
                    <td className={td}>
                      {POS_ROLE_LABELS[s.posRole]}
                      {s.posRole === "MANAGER" && <div className="text-xs text-gray-400">{s.hasPassword ? "Can set up devices" : "PIN only"}</div>}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{s.maxDiscountPercent}%</td>
                    <td className={td}>
                      {!s.isActive ? <Pill>Inactive</Pill> : s.pinLocked ? <Pill tone="red">PIN locked</Pill> : <Pill tone="green">Active</Pill>}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{s.billCount}</td>
                    <td className={`${td} text-right`}>
                      <button onClick={() => openEdit(s)} className="text-sm text-foreground hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        )}
        <p className="text-xs text-gray-500 mt-4">
          Cashiers bill within their discount limit; above it, a manager or you approve with a PIN. Managers can also cancel bills, receive stock and print labels. Only you can open this admin panel.
        </p>
      </Card>

      <Card title={`POS devices (${devices.filter((d) => !d.revoked).length})`}>
        {devices.length === 0 ? (
          <p className="text-sm text-gray-500">No devices yet. Open <b>/pos</b> on the shop phone or iPad and sign in with your admin email and password to set it up.</p>
        ) : (
          <ul className="divide-y -my-2">
            {devices.map((d) => (
              <li key={d.id} className={`flex flex-wrap items-center gap-3 py-3 ${d.revoked ? "opacity-50" : ""}`}>
                <Smartphone className="w-5 h-5 text-foreground" />
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-medium">{d.name} {d.revoked && <Pill>Removed</Pill>}</p>
                  <p className="text-xs text-gray-500">Set up by {d.registeredBy ?? "—"} on {formatDateTime(d.createdAt)} · last used {formatDateTime(d.lastSeenAt)}</p>
                </div>
                {!d.revoked && (
                  <button onClick={() => revoke(d)} className="text-sm text-red-600 hover:underline">Remove</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={editing !== null} onClose={() => !busy && setEditing(null)} title={editing === "new" ? "Add staff" : `Edit ${editing?.name ?? "staff"}`} className="max-w-lg">
        <form onSubmit={save} className="space-y-4" noValidate>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Name *" htmlFor="s-name" error={errors.name}>
              <input id="s-name" className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email *" htmlFor="s-email" error={errors.email} hint={editing !== "new" ? "Email can't be changed" : "Used to identify them; they don't sign in with it"}>
              <input id="s-email" type="email" className={inputCls} value={form.email} disabled={editing !== "new"} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Role" htmlFor="s-role">
              <select id="s-role" className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Form["role"] })}>
                <option value="CASHIER">Cashier</option>
                <option value="MANAGER">Manager</option>
              </select>
            </Field>
            <Field label="Max discount without approval (%)" htmlFor="s-disc" error={errors.maxDiscountPercent}>
              <input id="s-disc" type="number" min={0} max={100} className={inputCls} value={form.maxDiscountPercent} onChange={(e) => setForm({ ...form, maxDiscountPercent: e.target.value })} />
            </Field>
            <Field label={editing === "new" ? "PIN (4-6 digits) *" : "New PIN (leave empty to keep)"} htmlFor="s-pin" error={errors.pin}>
              <input id="s-pin" inputMode="numeric" type="password" autoComplete="new-password" maxLength={6} className={inputCls} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })} />
            </Field>
            {form.role === "MANAGER" && (
              <Field label="Password (optional)" htmlFor="s-pass" error={errors.password} hint="Lets this manager set up new POS devices. 10+ characters.">
                <input id="s-pass" type="password" autoComplete="new-password" className={inputCls} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </Field>
            )}
          </div>
          {editing !== "new" && <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Active (can unlock the POS)" />}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-md bg-foreground text-white px-4 py-2 text-sm disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
