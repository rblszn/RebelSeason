"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Prevent closing via backdrop/Escape (e.g. while a request is in flight). */
  dismissible?: boolean;
}

/**
 * Accessible dialog: role="dialog", aria-modal, labelled by its title, Escape to close,
 * focus moved into the dialog on open and restored on close, background scroll locked.
 */
export function Modal({ open, onClose, title, children, className, dismissible = true }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
      if (e.key === "Tab" && panelRef.current) {
        // Keep focus inside the dialog.
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose, dismissible]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={dismissible ? onClose : undefined} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-white shadow-xl rounded-t-lg sm:rounded-lg p-6 outline-none",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 id={titleId} className="font-heading text-2xl text-foreground">
            {title}
          </h2>
          {dismissible && (
            <button onClick={onClose} className="p-1 -m-1 text-foreground/50 hover:text-foreground" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
