"use client";

import { useEffect, useRef, useState } from "react";
import { CameraOff, X } from "lucide-react";

/**
 * Reads barcodes with the device camera, continuously, until closed.
 * Uses the browser's built-in BarcodeDetector where available (Android Chrome, fast) and
 * falls back to the ZXing JavaScript reader (iPhone / iPad Safari, desktop Firefox).
 * The camera needs HTTPS (or localhost).
 */

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: { new (opts: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> };
  }
}

const FORMATS = ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39"];
const SAME_CODE_COOLDOWN_MS = 2000; // a tag held in view is only read once; move away to scan it again

export function CameraScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let zxingControls: { stop: () => void } | null = null;
    const last = { code: "", at: 0 };

    const found = (raw: string) => {
      const code = raw.trim();
      const now = Date.now();
      if (!code || (code === last.code && now - last.at < SAME_CODE_COOLDOWN_MS)) return;
      last.code = code;
      last.at = now;
      setFlash(true);
      setTimeout(() => setFlash(false), 250);
      navigator.vibrate?.(60);
      onDetectedRef.current(code);
    };

    (async () => {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("The camera only works on a secure (https) page. Open the POS from the website address.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was blocked. Allow the camera for this site in the browser settings, then try again."
            : name === "NotFoundError"
              ? "No camera was found on this device."
              : "Couldn't start the camera. Close other apps using it and try again."
        );
        return;
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => undefined);

      const Native = window.BarcodeDetector;
      const supported = Native ? await Native.getSupportedFormats().catch(() => [] as string[]) : [];
      if (Native && supported.includes("code_128")) {
        const detector = new Native({ formats: FORMATS.filter((f) => supported.includes(f)) });
        const tick = async () => {
          if (stopped) return;
          if (video.readyState >= 2) {
            const codes = await detector.detect(video).catch(() => []);
            if (codes[0]) found(codes[0].rawValue);
          }
          timer = setTimeout(tick, 120);
        };
        tick();
        return;
      }

      // Fallback: ZXing (loaded only when needed).
      const [{ BrowserMultiFormatOneDReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
      if (stopped) return;
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_39]);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 300 });
      zxingControls = await reader.decodeFromVideoElement(video, (result) => {
        if (result) found(result.getText());
      });
      if (stopped) zxingControls.stop();
    })();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] sm:aspect-video max-h-[42vh] w-full">
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <CameraOff className="w-8 h-8 opacity-70" />
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          {/* Aiming guide: a barcode-shaped window */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={`w-3/4 h-1/3 rounded-lg border-2 transition-colors ${flash ? "border-green-400 bg-green-400/20" : "border-white/80"}`} />
          </div>
          <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white/90 drop-shadow">Hold the tag&apos;s barcode inside the box</p>
        </>
      )}
      <button type="button" onClick={onClose} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-2" aria-label="Close camera">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
