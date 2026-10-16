"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import type { PosUnit } from "@/lib/pos/types";

/**
 * The product/barcode list kept on the device so scans resolve instantly, without a round trip
 * to the (US-hosted) database. Loaded from localStorage first, then refreshed from the server
 * on open, every few minutes and after each bill. The server re-checks prices and stock when
 * a bill is saved, so a slightly old cache can never mis-charge.
 */

const CACHE_KEY = "rebel-pos-catalog-v1";
const REFRESH_MS = 5 * 60_000;

function readCache(): PosUnit[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PosUnit[]) : [];
  } catch {
    return [];
  }
}

export function useCatalog() {
  const [units, setUnits] = useState<PosUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<Promise<PosUnit[]> | null>(null);

  const refresh = useCallback(() => {
    inFlight.current ??= api<{ units: PosUnit[] }>("/api/pos/catalog")
      .then(({ units: fresh }) => {
        setUnits(fresh);
        setError(null);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
        } catch {
          // storage full / blocked: the in-memory list still works
        }
        return fresh;
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Couldn't load products");
        return [] as PosUnit[];
      })
      .finally(() => {
        inFlight.current = null;
        setLoading(false);
      });
    return inFlight.current;
  }, []);

  useEffect(() => {
    const cached = readCache();
    // Show the cached list straight away; the server copy replaces it moments later.
    if (cached.length) queueMicrotask(() => setUnits((v) => (v.length ? v : cached)));
    refresh();
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const byCode = useMemo(() => {
    const map = new Map<string, PosUnit>();
    for (const v of units) {
      map.set(v.barcode, v);
      for (const c of v.codes) map.set(c, v);
    }
    return map;
  }, [units]);

  const lookup = useCallback((code: string) => byCode.get(code.trim()) ?? null, [byCode]);

  /** Name search for when a tag is missing. */
  const search = useCallback(
    (q: string, limit = 8) => {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) return [];
      return units
        .filter((v) => {
          const hay = `${v.name} ${v.size ?? ""} ${v.barcode}`.toLowerCase();
          return terms.every((t) => hay.includes(t));
        })
        .slice(0, limit);
    },
    [units]
  );

  return { units, loading, error, refresh, lookup, search };
}

/** Small JSON helpers for per-device conveniences (held bills, the bill in progress). */
export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocal(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore: private mode / storage full
  }
}
