"use client";

import { LoaderCircle, Mail, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { emailReceiptAction, refundAction } from "@/app/kassa/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/form";
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
