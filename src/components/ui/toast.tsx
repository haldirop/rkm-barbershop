"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Toast = { id: number; tone: "success" | "error"; message: string };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(tone: Toast["tone"], message: string) {
  const id = nextId++;
  toasts = [...toasts.slice(-2), { id, tone, message }];
  emit();
  window.setTimeout(() => dismiss(id), 4500);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};

const EMPTY: Toast[] = [];

export function Toaster() {
  const items = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => toasts,
    () => EMPTY,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
    >
      {items.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cn(
            "pointer-events-auto flex w-full max-w-sm animate-fade-up items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl shadow-black/50",
            t.tone === "success" ? "border-emerald-400/30 bg-surface-2 text-ink" : "border-red-400/40 bg-surface-2 text-ink",
          )}
        >
          {t.tone === "success" ? (
            <CircleCheck className="size-5 shrink-0 text-emerald-400" aria-hidden />
          ) : (
            <CircleAlert className="size-5 shrink-0 text-red-400" aria-hidden />
          )}
          <span className="flex-1">{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} className="text-ink-faint hover:text-ink" aria-label="Sluiten">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
