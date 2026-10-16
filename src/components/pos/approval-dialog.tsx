"use client";

import { useState } from "react";
import { UserRound } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { POS_ROLE_LABELS, type PosRoleType } from "@/lib/pos/types";
import { PinPad } from "./pin-pad";

export type Approver = { id: string; name: string; role: PosRoleType };
export type Approval = { staffId: string; pin: string };

/**
 * A manager / the owner approves an action on the cashier's screen with their own PIN
 * (discount above the cashier's limit, cancelling a bill). The PIN is checked by the server
 * when the action is submitted.
 */
export function ApprovalDialog({
  open,
  title,
  reason,
  approvers,
  error,
  onApprove,
  onClose,
}: {
  open: boolean;
  title: string;
  reason: string;
  approvers: Approver[];
  error?: string | null;
  onApprove: (approval: Approval) => void;
  onClose: () => void;
}) {
  const [who, setWho] = useState<string | null>(approvers.length === 1 ? approvers[0].id : null);
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-sm">
      <p className="text-sm text-gray-600 mb-4">{reason}</p>
      {approvers.length === 0 ? (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-md p-3">No manager has a PIN yet. The owner can add one in Admin → Staff.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {approvers.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setWho(a.id)}
                className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", who === a.id ? "border-foreground bg-foreground/5 text-foreground" : "border-gray-200")}
              >
                <UserRound className="w-4 h-4" /> {a.name} <span className="text-xs text-gray-500">{POS_ROLE_LABELS[a.role]}</span>
              </button>
            ))}
          </div>
          {who ? <PinPad onSubmit={(pin) => onApprove({ staffId: who, pin })} error={error} /> : <p className="text-sm text-gray-500">Choose who is approving.</p>}
        </>
      )}
    </Modal>
  );
}
