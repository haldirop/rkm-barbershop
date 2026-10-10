"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { SimpleResult } from "@/app/admin/actions/helpers";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Label, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";

/** After success: go to `afterHref`, or reload the current page. */
function useFinish(afterHref?: string) {
  const router = useRouter();
  return () => (afterHref ? router.push(afterHref) : router.refresh());
}

/**
 * Owner only: remove something (a receipt, a cash count) with a reason. It is kept under
 * "Verwijderde …" unless "Meteen definitief verwijderen" is ticked.
 */
export function OwnerDeleteButton({
  label,
  title,
  description,
  keptIn,
  placeholder,
  action,
  afterHref,
}: {
  label: string;
  title: string;
  description: string;
  /** Where a removed item stays visible, e.g. "‘Verwijderde bonnen’". */
  keptIn: string;
  placeholder: string;
  action: (reason: string, permanent: boolean) => Promise<SimpleResult>;
  afterHref?: string;
}) {
  const finish = useFinish(afterHref);
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [permanent, setPermanent] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await action(reason, permanent);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      finish();
    });
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="text-red-300 hover:text-red-200">
        <Trash2 className="size-4" aria-hidden /> {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <div className="space-y-4">
          <div>
            <Label htmlFor={reasonId}>Reden</Label>
            <Textarea
              id={reasonId}
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
              className="min-h-20"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong p-3 text-sm">
            <Checkbox checked={permanent} onChange={(e) => setPermanent(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium text-ink">Meteen definitief verwijderen</span>
              <span className="mt-0.5 block text-ink-muted">
                {permanent
                  ? `Wordt helemaal gewist, ook uit ${keptIn}. Dit kan niet ongedaan worden gemaakt.`
                  : `Uit: blijft met de reden bewaard onder ${keptIn} en kan later alsnog definitief weg.`}
              </span>
            </span>
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Annuleren
            </Button>
            <Button variant="danger" onClick={confirm} disabled={pending || reason.trim().length < 3}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              {permanent ? "Definitief verwijderen" : "Verwijderen"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Owner only: wipe something that was removed earlier, for good. */
export function OwnerPurgeButton({
  title,
  description,
  action,
  afterHref,
  compact = false,
}: {
  title: string;
  description: string;
  action: () => Promise<SimpleResult>;
  afterHref?: string;
  /** A small button, e.g. in a list. */
  compact?: boolean;
}) {
  const finish = useFinish(afterHref);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      finish();
    });
  }

  return (
    <>
      <Button variant="danger" size={compact ? "sm" : "md"} onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden /> Definitief verwijderen
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Annuleren
          </Button>
          <Button variant="danger" onClick={confirm} disabled={pending}>
            {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
            Definitief verwijderen
          </Button>
        </div>
      </Dialog>
    </>
  );
}
