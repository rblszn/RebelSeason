"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Mail, Plus, Printer, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ApiError, api, errorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";
import { ApprovalDialog, type Approval, type Approver } from "@/components/pos/approval-dialog";
import { usePosUser } from "@/components/pos/pos-shell";

type BillInfo = { id: string; billNumber: string; total: number; email: string | null; cancelled: boolean; canCancel: boolean };

/** Print (A4), email, start the next bill, or cancel (manager) a shop bill. */
export function BillActions({ bill, justCreated, emailed, approvers }: { bill: BillInfo; justCreated: boolean; emailed: boolean; approvers: Approver[] }) {
  const router = useRouter();
  const toast = useToast();
  const user = usePosUser();
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState(bill.email ?? "");
  const [sending, setSending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const isManager = user.role !== "CASHIER";

  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api(`/api/pos/bills/${bill.id}/email`, { body: { email } });
      toast(`Bill emailed to ${email}`);
      setEmailOpen(false);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSending(false);
    }
  };

  const cancel = async (approval?: Approval) => {
    setCancelling(true);
    try {
      await api(`/api/pos/bills/${bill.id}/cancel`, { body: { reason, approval } });
      toast("Bill cancelled. The items are back in stock.");
      setCancelOpen(false);
      setApprovalOpen(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && (err.code === "APPROVAL_REQUIRED" || (approval && err.status === 401))) {
        setApprovalError(err.code === "APPROVAL_REQUIRED" ? null : err.message);
        setApprovalOpen(true);
      } else {
        toast(errorMessage(err), "error");
      }
    } finally {
      setCancelling(false);
    }
  };

  const btn = "inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 h-11 text-sm font-medium hover:border-foreground";
  return (
    <div className="print:hidden space-y-3">
      {justCreated && !bill.cancelled && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
          <CheckCircle2 className="w-6 h-6 text-green-700 shrink-0" />
          <div className="text-sm text-green-900">
            <p className="font-medium">Bill {bill.billNumber} saved · {formatPrice(bill.total)}</p>
            <p>{emailed ? `The bill is being emailed to ${bill.email}.` : "Print it, or email it to the customer."}</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href="/pos/bill" className="inline-flex items-center gap-2 rounded-lg bg-foreground text-white px-4 h-11 text-sm font-medium">
          <Plus className="w-4 h-4" /> New bill
        </Link>
        <button onClick={() => window.print()} className={btn}>
          <Printer className="w-4 h-4" /> Print A4
        </button>
        {!bill.cancelled && (
          <button onClick={() => setEmailOpen(true)} className={btn}>
            <Mail className="w-4 h-4" /> Email
          </button>
        )}
        <Link href="/pos/bills" className={btn}>Today&apos;s bills</Link>
        {!bill.cancelled && bill.canCancel && (
          <button onClick={() => setCancelOpen(true)} className={`${btn} text-red-700 hover:border-red-600 sm:ml-auto`}>
            <XCircle className="w-4 h-4" /> Cancel bill
          </button>
        )}
      </div>

      <Modal open={emailOpen} onClose={() => setEmailOpen(false)} title="Email the bill" className="max-w-sm">
        <form onSubmit={sendEmail} className="space-y-3">
          <input type="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="customer@email.com" aria-label="Email address" className="w-full h-11 border border-gray-300 rounded-lg px-3 text-base focus:outline-none focus:border-foreground" />
          <button type="submit" disabled={sending || !email} className="w-full h-11 rounded-lg bg-foreground text-white font-medium disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
        </form>
      </Modal>

      <Modal open={cancelOpen} onClose={() => !cancelling && setCancelOpen(false)} title={`Cancel bill ${bill.billNumber}?`} className="max-w-sm" dismissible={!cancelling}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isManager) cancel();
            else {
              setApprovalError(null);
              setApprovalOpen(true);
            }
          }}
          className="space-y-3"
        >
          <p className="text-sm text-gray-600">Use this only for a bill made by mistake. The items go back into stock (shop and website) and the bill stops counting in today&apos;s sales and cash. Give any money back to the customer.</p>
          <textarea required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason, e.g. wrong size billed" aria-label="Reason" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:border-foreground" />
          <button type="submit" disabled={cancelling || reason.trim().length < 3} className="w-full h-11 rounded-lg bg-red-600 text-white font-medium disabled:opacity-50">
            {cancelling ? "Cancelling…" : isManager ? "Cancel bill" : "Ask a manager to approve"}
          </button>
        </form>
      </Modal>

      {approvalOpen && (
        <ApprovalDialog
          open
          title="Manager approval"
          reason={`Cancelling bill ${bill.billNumber} needs a manager's PIN.`}
          approvers={approvers}
          error={approvalError}
          onClose={() => setApprovalOpen(false)}
          onApprove={(a) => cancel(a)}
        />
      )}
    </div>
  );
}
