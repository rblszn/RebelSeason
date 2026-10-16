"use client";

import { ApiError } from "@/lib/api-client";

/** Fetch a file from our API and save it, surfacing the server's error message on failure. */
async function save(res: Response, fallbackName: string) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.error ?? "Couldn't create the file. Please try again.", data.code);
  }
  const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "")?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const request = (input: string, init?: RequestInit) =>
  fetch(input, { credentials: "same-origin", ...init }).catch(() => {
    throw new ApiError(0, "Network error. Please check your connection and try again.");
  });

/** Labels PDF for exact items/quantities. */
export async function downloadLabels(body: { lines: { barcode: string; quantity: number }[]; startAt?: number; guides?: boolean }) {
  const res = await request("/api/pos/labels", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  await save(res, "rebel-labels.pdf");
}

/** Labels PDF for a department / category / product, or the test sheet. */
export async function downloadLabelsFor(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  await save(await request(`/api/pos/labels?${qs}`), "rebel-labels.pdf");
}
