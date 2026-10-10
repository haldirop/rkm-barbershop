"use client";

import { LoaderCircle, Mail, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSaleAction, emailReceiptAction, purgeSaleAction, refundAction } from "@/app/kassa/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Input, Label, Textarea } from "@/components/ui/form";
import { toast } from "@/components/ui/toast";

/** E-mail a receipt (again), e.g. when the customer asks for it later. */
export function EmailReceipt({ saleId, defaultEmail }: { saleId: string; defaultEmail: string | null }) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [pending, startTransition] = useTransition();

  function send(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await emailReceiptAction(saleId, email);
      if (result.ok) toast.success(result.message);
      else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        inputMode="email"
        required
        aria-label="E-mailadres"
        placeholder="klant@voorbeeld.nl"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11"
      />
      <Button type="submit" variant="secondary" disabled={pending || !email.trim()} className="h-11">
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
        Mailen
      </Button>
    </form>
  );
}

/** Undo a receipt with a refund receipt; the receipt itself is never changed. */
export function RefundButton({ saleId, number, total }: { saleId: string; number: number; total: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await refundAction(saleId, reason);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.push(`/kassa/bonnen/${result.refundId}`);
    });
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Undo2 className="size-4" aria-hidden /> Tegenboeking
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Bon ${number} terugdraaien?`}
        description={`Er komt een nieuwe bon met ${total} negatief. Betaal het bedrag terug op dezelfde manier als het betaald is. Producten gaan terug in de voorraad.`}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor={`refund-${saleId}`}>Reden</Label>
            <Textarea
              id={`refund-${saleId}`}
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bijv. verkeerd aangeslagen, klant niet tevreden"
              className="min-h-20"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Annuleren
            </Button>
            <Button variant="danger" onClick={confirm} disabled={pending || reason.trim().length < 3}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              Tegenboeking maken
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

/** Owner only: remove a receipt. It stops counting everywhere but stays on record. */
export function DeleteReceiptButton({
  saleId,
  number,
  refundNumber,
  backHref,
}: {
  saleId: string;
  number: number;
  /** The refund that is removed along with this sale. */
  refundNumber: number | null;
  backHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [permanent, setPermanent] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteSaleAction(saleId, reason, permanent);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.push(backHref);
    });
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="text-red-300 hover:text-red-200">
        <Trash2 className="size-4" aria-hidden /> Bon verwijderen
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Bon ${number} verwijderen?`}
        description={`De bon${refundNumber ? ` en tegenboeking ${refundNumber}` : ""} verdwijnt uit alle overzichten, de omzet en de export. Producten gaan terug in de voorraad.`}
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor={`delete-${saleId}`}>Reden</Label>
            <Textarea
              id={`delete-${saleId}`}
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Bijv. testbon, dubbel aangeslagen"
              className="min-h-20"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line-strong p-3 text-sm">
            <Checkbox checked={permanent} onChange={(e) => setPermanent(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium text-ink">Meteen definitief verwijderen</span>
              <span className="mt-0.5 block text-ink-muted">
                {permanent
                  ? "De bon wordt helemaal gewist, ook uit ‘Verwijderde bonnen’. Dit kan niet ongedaan worden gemaakt."
                  : "Uit: de bon blijft met de reden bewaard onder ‘Verwijderde bonnen’ en kan later alsnog definitief weg."}
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

/** Owner only: wipe a removed receipt completely. */
export function PurgeReceiptButton({
  saleId,
  number,
  backHref,
}: {
  saleId: string;
  number: number;
  backHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await purgeSaleAction(saleId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.push(backHref);
    });
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden /> Definitief verwijderen
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Bon ${number} definitief verwijderen?`}
        description="De bon wordt helemaal gewist, ook uit ‘Verwijderde bonnen’, samen met een eventuele tegenboeking. Dit kan niet ongedaan worden gemaakt."
      >
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
