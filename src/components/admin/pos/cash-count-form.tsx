"use client";

import { useActionState, useState } from "react";
import { saveCashCountAction } from "@/app/admin/actions/pos";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import { formatAmount } from "@/lib/format";
import { centsToInput, parseEuroCents } from "@/lib/pos";
import { FormError, useActionFeedback } from "../form-helpers";

/** "Kas tellen": change at opening + what's counted, against the cash receipts of the day. */
export function CashCountForm({
  date,
  cashSalesCents,
  defaultFloatCents,
  defaultCountedCents,
  defaultNote,
}: {
  date: string;
  cashSalesCents: number;
  defaultFloatCents: number;
  defaultCountedCents: number | null;
  defaultNote: string | null;
}) {
  const [state, action] = useActionState(saveCashCountAction, null);
  useActionFeedback(state);
  const errors = state?.fieldErrors ?? {};
  const [float, setFloat] = useState(centsToInput(defaultFloatCents));
  const [counted, setCounted] = useState(defaultCountedCents === null ? "" : centsToInput(defaultCountedCents));

  const floatCents = parseEuroCents(float.trim() || "0");
  const countedCents = counted.trim() ? parseEuroCents(counted) : null;
  const expected = floatCents === null ? null : floatCents + cashSalesCents;
  const difference = expected !== null && countedCents !== null ? countedCents - expected : null;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="date" value={date} />
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Wisselgeld bij opening (€)" htmlFor="float" error={errors.float} hint="Wat er aan het begin van de dag in de kas zat.">
          <Input id="float" name="float" inputMode="decimal" value={float} onChange={(e) => setFloat(e.target.value)} />
        </Field>
        <Field label="Geteld in de kas (€)" htmlFor="counted" error={errors.counted}>
          <Input
            id="counted"
            name="counted"
            inputMode="decimal"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            placeholder={expected === null ? "" : centsToInput(expected)}
            required
          />
        </Field>
      </div>
      <dl className="grid gap-2 rounded-xl border border-line bg-surface-2 p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-faint">Contant ontvangen</dt>
          <dd className="font-semibold text-ink tabular-nums">{formatAmount(cashSalesCents)}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Hoort in de kas</dt>
          <dd className="font-semibold text-ink tabular-nums">{expected === null ? "—" : formatAmount(expected)}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Verschil</dt>
          <dd
            className={cn(
              "font-semibold tabular-nums",
              difference === null ? "text-ink" : difference === 0 ? "text-emerald-300" : "text-amber-300",
            )}
          >
            {difference === null ? "—" : `${difference > 0 ? "+" : ""}${formatAmount(difference)}`}
          </dd>
        </div>
      </dl>
      <Field label="Opmerking (optioneel)" htmlFor="note" error={errors.note}>
        <Input id="note" name="note" maxLength={300} defaultValue={defaultNote ?? ""} placeholder="Bijv. € 5 te veel, klant gaf fooi contant" />
      </Field>
      <div className="flex justify-end">
        <SubmitButton pendingText="Opslaan…">Kastelling opslaan</SubmitButton>
      </div>
    </form>
  );
}
