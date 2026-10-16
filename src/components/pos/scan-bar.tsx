"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ScanLine, Search } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { PosUnit } from "@/lib/pos/types";
import { CameraScanner } from "./camera-scanner";

const isTouch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const isTypingTarget = (el: Element | null) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement | null)?.isContentEditable;

/**
 * One place to add items: phone camera, a USB/Bluetooth scanner (it "types" the code and
 * presses Enter, even when nothing is focused), or typing a code / product name.
 * Codes are resolved with `lookup`; anything not found goes to `onUnknown`.
 */
export function ScanBar({
  lookup,
  onPick,
  onUnknown,
  search,
  placeholder = "Scan or type a barcode / product name",
  startWithCamera = false,
}: {
  lookup: (code: string) => PosUnit | null;
  onPick: (variant: PosUnit) => void;
  onUnknown: (code: string) => void;
  search: (q: string) => PosUnit[];
  placeholder?: string;
  startWithCamera?: boolean;
}) {
  const [value, setValue] = useState("");
  const [camera, setCamera] = useState(startWithCamera);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = value.trim().length >= 2 ? search(value) : [];

  const onCode = (code: string) => {
    const hit = lookup(code);
    if (hit) onPick(hit);
    else onUnknown(code);
  };
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  });

  // Keep the box ready for a scanner on computers (not on phones: it would pop the keyboard).
  useEffect(() => {
    if (!isTouch()) inputRef.current?.focus();
  }, []);

  // A hardware scanner types very fast and ends with Enter. Catch it even when focus is elsewhere.
  useEffect(() => {
    let buffer = "";
    let lastKey = 0;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey) return;
      const now = Date.now();
      if (now - lastKey > 60) buffer = "";
      lastKey = now;
      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          e.preventDefault();
          onCodeRef.current(buffer);
        }
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Enter: an exact code wins, then a single name match; otherwise show the matches. */
  const submit = () => {
    const q = value.trim();
    if (!q) return;
    const hit = lookup(q);
    if (hit) return pick(hit);
    if (results.length === 1) return pick(results[0]);
    if (results.length > 1) return setOpen(true);
    onUnknown(q);
    setValue("");
  };

  const pick = (v: PosUnit) => {
    onPick(v);
    setValue("");
    setOpen(false);
    if (!isTouch()) inputRef.current?.focus();
  };

  return (
    <div className="space-y-2">
      {camera && <CameraScanner onDetected={(code) => onCodeRef.current(code)} onClose={() => setCamera(false)} />}
      <div className="relative">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCamera((c) => !c)}
            className={cn("shrink-0 inline-flex items-center gap-2 rounded-lg px-4 h-12 font-medium", camera ? "bg-gray-200 text-foreground" : "bg-foreground text-white")}
            aria-pressed={camera}
          >
            <Camera className="w-5 h-5" />
            <span className="hidden sm:inline">{camera ? "Close camera" : "Scan"}</span>
          </button>
          <form
            className="relative flex-1 min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
              }}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder={placeholder}
              aria-label={placeholder}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              className="w-full h-12 border border-gray-300 rounded-lg pl-10 pr-3 text-base bg-white focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground"
            />
          </form>
        </div>
        {open && results.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto" role="listbox">
            {results.map((v) => (
              <li key={v.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(v)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50">
                  <Thumb src={v.imageUrl} alt={v.name} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{v.name}</span>
                    <span className="block text-xs text-gray-500 truncate">{v.size ? `Size ${v.size}` : "No size"} · {v.stock} in stock</span>
                  </span>
                  <span className="text-sm tabular-nums">{formatPrice(v.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && value.trim().length >= 2 && results.length === 0 && (
          <p className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
            <Search className="w-4 h-4" /> No product matches. Check the code or try another word.
          </p>
        )}
      </div>
    </div>
  );
}

export function Thumb({ src, alt, size = 40 }: { src: string | null; alt: string; size?: number }) {
  return src ? (
    <Image src={src} alt={alt} width={size} height={size} className="rounded object-cover shrink-0 bg-gray-100" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded bg-gray-100 shrink-0" style={{ width: size, height: size }} aria-hidden />
  );
}
