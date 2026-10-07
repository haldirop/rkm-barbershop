"use client";

import { Ban, Check, CheckCheck, LoaderCircle, RotateCcw, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { removeAppointment, setAppointmentStatus, type ActionResult } from "@/app/admin/actions/appointments";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Label, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";
import type { AppointmentStatus } from "@/lib/status";

type Intent = "REJECTED" | "CANCELLED" | "DELETE" | null;

const DIALOGS = {
  REJECTED: {
    title: "Aanvraag weigeren",
    description: "Het tijdslot komt weer vrij. Geef eventueel een korte toelichting voor de klant.",
    confirm: "Weigeren",
  },
  CANCELLED: {
    title: "Afspraak annuleren",
    description: "Het tijdslot komt weer vrij voor andere klanten.",
    confirm: "Annuleren",
  },
  DELETE: {
    title: "Afspraak verwijderen",
    description: "De afspraak wordt definitief verwijderd, inclusief de geschiedenis. Dit kan niet ongedaan worden gemaakt.",
    confirm: "Definitief verwijderen",
  },
};

/**
 * Status buttons for one appointment. `variant="quick"` shows only the big
 * GOEDKEUREN / WEIGEREN pair for open requests.
 */
export function StatusActions({
  id,
  status,
  hasEmail,
  isPast = false,
  variant = "full",
}: {
  id: string;
  status: AppointmentStatus;
  hasEmail: boolean;
  isPast?: boolean;
  variant?: "quick" | "full";
}) {
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<Intent>(null);
  const [reason, setReason] = useState("");
  const [notify, setNotify] = useState(true);

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        after?.();
      } else {
        toast.error(result.error);
      }
    });
  }

  const close = () => {
    setIntent(null);
    setReason("");
    setNotify(true);
  };

  function confirmDialog() {
    if (intent === "DELETE") return run(() => removeAppointment(id));
    if (intent) run(() => setAppointmentStatus(id, intent, { reason, notify: notify && hasEmail }), close);
  }

  const spinner = pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null;

  return (
    <>
      <div className={variant === "quick" ? "grid grid-cols-2 gap-2 sm:flex" : "flex flex-wrap gap-2"}>
        {status === "PENDING" ? (
          <>
            <Button variant="success" disabled={pending} onClick={() => run(() => setAppointmentStatus(id, "APPROVED"))}>
              {spinner ?? <Check className="size-4" aria-hidden />} Goedkeuren
            </Button>
            <Button variant="danger" disabled={pending} onClick={() => setIntent("REJECTED")}>
              <X className="size-4" aria-hidden /> Weigeren
            </Button>
          </>
        ) : null}

        {variant === "full" && status === "APPROVED" ? (
          <>
            {isPast ? (
              <Button disabled={pending} onClick={() => run(() => setAppointmentStatus(id, "COMPLETED"))}>
                {spinner ?? <CheckCheck className="size-4" aria-hidden />} Markeer als afgerond
              </Button>
            ) : null}
            <Button variant="danger" disabled={pending} onClick={() => setIntent("CANCELLED")}>
              <Ban className="size-4" aria-hidden /> Annuleren
            </Button>
          </>
        ) : null}

        {variant === "full" && status === "PENDING" ? (
          <Button variant="ghost" disabled={pending} onClick={() => setIntent("CANCELLED")}>
            <Ban className="size-4" aria-hidden /> Annuleren
          </Button>
        ) : null}

        {variant === "full" && (status === "REJECTED" || status === "CANCELLED" || status === "COMPLETED") ? (
          <Button variant="secondary" disabled={pending} onClick={() => run(() => setAppointmentStatus(id, "APPROVED"))}>
            {spinner ?? <RotateCcw className="size-4" aria-hidden />}
            {status === "COMPLETED" ? "Terug naar bevestigd" : "Toch bevestigen"}
          </Button>
        ) : null}

        {variant === "full" ? (
          <Button variant="ghost" disabled={pending} onClick={() => setIntent("DELETE")} className="text-red-300 hover:text-red-200">
            <Trash2 className="size-4" aria-hidden /> Verwijderen
          </Button>
        ) : null}
      </div>

      <Dialog
        open={intent !== null}
        onClose={close}
        title={intent ? DIALOGS[intent].title : ""}
        description={intent ? DIALOGS[intent].description : undefined}
      >
        {intent === "REJECTED" || intent === "CANCELLED" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor={`reason-${id}`}>Toelichting voor de klant (optioneel)</Label>
              <Textarea
                id={`reason-${id}`}
                value={reason}
                maxLength={300}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Bijvoorbeeld: op dit moment zijn we helaas volgeboekt."
              />
            </div>
            <label className="flex items-center gap-3 text-sm text-ink-muted">
              <Checkbox checked={notify && hasEmail} disabled={!hasEmail} onChange={(e) => setNotify(e.target.checked)} />
              {hasEmail ? "Klant informeren per e-mail" : "Geen e-mailadres bekend — informeer de klant telefonisch"}
            </label>
          </div>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={close} disabled={pending}>
            Terug
          </Button>
          <Button variant="danger" onClick={confirmDialog} disabled={pending}>
            {spinner}
            {intent ? DIALOGS[intent].confirm : ""}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
