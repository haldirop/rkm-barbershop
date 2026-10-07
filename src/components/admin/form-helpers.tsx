"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormState } from "@/app/admin/actions/types";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";

/** Shows a toast for a successful form action, and optionally resets the form. */
export function useActionFeedback(state: FormState, opts: { resetForm?: boolean } = {}) {
  const formRef = useRef<HTMLFormElement>(null);
  const shown = useRef<FormState>(null);
  useEffect(() => {
    if (!state || state === shown.current) return;
    shown.current = state;
    if (state.ok && state.message) {
      toast.success(state.message);
      if (opts.resetForm) formRef.current?.reset();
    }
  }, [state, opts.resetForm]);
  return formRef;
}

export function FormError({ state }: { state: FormState }) {
  return state?.error ? <Alert tone="error">{state.error}</Alert> : null;
}

type DeleteResult = { ok: true; message: string } | { ok: false; error: string };

export function DeleteButton({
  action,
  title,
  description,
  label = "Verwijderen",
  compact = false,
}: {
  action: () => Promise<DeleteResult>;
  title: string;
  description: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="grid size-9 place-items-center rounded-full text-ink-faint hover:bg-red-400/10 hover:text-red-300"
          aria-label={label}
        >
          <Trash2 className="size-4" />
        </button>
      ) : (
        <Button variant="ghost" onClick={() => setOpen(true)} className="text-red-300 hover:text-red-200">
          <Trash2 className="size-4" aria-hidden /> {label}
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Annuleren
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            {label}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
