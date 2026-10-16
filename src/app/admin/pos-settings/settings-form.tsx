"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, inputCls } from "@/components/admin/ui";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, fieldErrors } from "@/lib/api-client";
import { financialYear } from "@/lib/ist";

type Settings = {
  storeName: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  gstin: string;
  billFooter: string;
  upiId: string;
  invoicePrefix: string;
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setS({ ...s, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api("/api/admin/pos-settings", { method: "PUT", body: s });
      toast("Settings saved");
      router.refresh();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6 max-w-3xl" noValidate>
      <Card title="Shop details on bills">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Shop / business name *" htmlFor="st-name" error={errors.storeName} className="sm:col-span-2">
            <input id="st-name" className={inputCls} value={s.storeName} onChange={set("storeName")} />
          </Field>
          <Field label="Address" htmlFor="st-addr" error={errors.addressLine} className="sm:col-span-2">
            <input id="st-addr" className={inputCls} value={s.addressLine} onChange={set("addressLine")} placeholder="Shop no., building, street" />
          </Field>
          <Field label="City" htmlFor="st-city" error={errors.city}><input id="st-city" className={inputCls} value={s.city} onChange={set("city")} /></Field>
          <Field label="State" htmlFor="st-state" error={errors.state}><input id="st-state" className={inputCls} value={s.state} onChange={set("state")} /></Field>
          <Field label="PIN code" htmlFor="st-pin" error={errors.pincode}><input id="st-pin" className={inputCls} value={s.pincode} onChange={set("pincode")} /></Field>
          <Field label="Phone" htmlFor="st-phone" error={errors.phone}><input id="st-phone" className={inputCls} value={s.phone} onChange={set("phone")} /></Field>
          <Field label="Email" htmlFor="st-email" error={errors.email} hint="Also receives the day-end summary when the day is closed">
            <input id="st-email" type="email" className={inputCls} value={s.email} onChange={set("email")} />
          </Field>
          <Field label="GSTIN (optional)" htmlFor="st-gstin" error={errors.gstin} hint="Printed on bills when set. Prices stay tax-inclusive.">
            <input id="st-gstin" className={`${inputCls} uppercase`} value={s.gstin} onChange={set("gstin")} maxLength={15} />
          </Field>
          <Field label="Bill footer" htmlFor="st-footer" error={errors.billFooter} className="sm:col-span-2" hint="e.g. no-return policy, thank-you note">
            <textarea id="st-footer" rows={2} className={inputCls} value={s.billFooter} onChange={set("billFooter")} />
          </Field>
        </div>
      </Card>

      <Card title="Payments & bill numbers">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Shop UPI ID (optional)" htmlFor="st-upi" error={errors.upiId} hint="When set, the POS shows a UPI QR with the exact bill amount. Double-check it: payments go to this ID.">
            <input id="st-upi" className={inputCls} value={s.upiId} onChange={set("upiId")} placeholder="shopname@okhdfcbank" />
          </Field>
          <Field label="Bill number prefix" htmlFor="st-prefix" error={errors.invoicePrefix} hint={`Bills are numbered ${s.invoicePrefix || "RSS"}/${financialYear()}/00001, 00002 … (restarting each April)`}>
            <input id="st-prefix" className={`${inputCls} uppercase`} value={s.invoicePrefix} onChange={set("invoicePrefix")} maxLength={8} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="rounded-md bg-foreground text-white px-5 py-2.5 text-sm disabled:opacity-60">{busy ? "Saving…" : "Save settings"}</button>
      </div>
    </form>
  );
}
