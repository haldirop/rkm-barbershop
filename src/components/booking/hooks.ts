"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

interface FetchState<T> {
  key: string;
  data?: T;
  error?: string;
}

/** Fetches JSON for `url` (null = skip). Stale responses are ignored automatically. */
export function useJson<T>(url: string | null) {
  const [state, setState] = useState<FetchState<T> | null>(null);
  const [version, setVersion] = useState(0);
  const key = url ? `${url}#${version}` : null;

  useEffect(() => {
    if (!url || !key) return;
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        setState(
          res.ok
            ? { key, data: body as T }
            : { key, error: (body as { error?: string }).error ?? "Er ging iets mis. Probeer het opnieuw." },
        );
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") {
          setState({ key, error: "Geen verbinding. Controleer je internet en probeer het opnieuw." });
        }
      });
    return () => controller.abort();
  }, [url, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = state && state.key === key ? state : null;
  // Keep showing the previous data while a reload for the same URL is in flight.
  const previous = state && url && state.key.startsWith(`${url}#`) ? state : null;
  return {
    data: current?.data ?? previous?.data,
    error: current?.error,
    loading: Boolean(key) && !current,
    reload,
  };
}

const STORAGE_EVENT = "rkm-storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

/**
 * Reads a localStorage value without hydration mismatches (null on the server).
 * Only used for conveniences such as remembering a favourite barber.
 */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

export function writeStoredValue(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // Storage unavailable (private mode): the feature simply isn't remembered.
  }
}

export const STORAGE_KEYS = {
  favoriteBarber: "rkm.favoriteBarber",
  customer: "rkm.customerDetails",
} as const;
