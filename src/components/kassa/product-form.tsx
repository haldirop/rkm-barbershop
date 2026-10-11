"use client";

import { useActionState } from "react";
import { deleteProductAction, saveProductAction } from "@/app/kassa/actions";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { centsToInput } from "@/lib/pos";
import { DeleteButton, FormError, useActionFeedback } from "@/components/admin/form-helpers";

export interface ProductValues {
  id: string;
  name: string;
  priceCents: number;
  vatRate: number;
  stock: number | null;
  lowStockAt: number | null;
  isActive: boolean;
  sortOrder: number;
}

export function ProductForm({ product }: { product?: ProductValues }) {
  const [state, action] = useActionState(saveProductAction, null);
  const formRef = useActionFeedback(state, { resetForm: !product });
  const errors = state?.fieldErrors ?? {};
  const key = product?.id ?? "new";

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="id" value={product?.id ?? ""} />
      <FormError state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <Field label="Naam" htmlFor={`name-${key}`} error={errors.name}>
          <Input id={`name-${key}`} name="name" defaultValue={product?.name} required maxLength={60} placeholder="Bijv. Matte wax 100 ml" />
        </Field>
        <Field label="Prijs (€)" htmlFor={`price-${key}`} error={errors.price}>
          <Input
            id={`price-${key}`}
            name="price"
            inputMode="decimal"
            defaultValue={product ? centsToInput(product.priceCents) : ""}
            placeholder="14,95"
            required
          />
        </Field>
        <Field label="Btw" htmlFor={`vat-${key}`} error={errors.vatRate}>
          <Select id={`vat-${key}`} name="vatRate" defaultValue={String(product?.vatRate ?? 21)}>
            <option value="21">21%</option>
            <option value="9">9%</option>
            <option value="0">0%</option>
          </Select>
        </Field>
        <Field label="Voorraad" htmlFor={`stock-${key}`} error={errors.stock} hint="Leeg = niet bijhouden.">
          <Input
            id={`stock-${key}`}
            name="stock"
            type="number"
            min={0}
            max={99999}
            defaultValue={product?.stock ?? ""}
            placeholder="—"
          />
        </Field>
        <Field label="Melding bij" htmlFor={`low-${key}`} error={errors.lowStockAt} hint="Waarschuw bij deze voorraad. Leeg = nooit.">
          <Input
            id={`low-${key}`}
            name="lowStockAt"
            type="number"
            min={0}
            max={99999}
            defaultValue={product ? (product.lowStockAt ?? "") : 3}
            placeholder="—"
          />
        </Field>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-end gap-6">
          <Field label="Volgorde" htmlFor={`sort-${key}`} className="w-24">
            <Input id={`sort-${key}`} name="sortOrder" type="number" min={0} max={999} defaultValue={product?.sortOrder ?? 0} />
          </Field>
          <label className="flex h-12 items-center gap-3 text-sm text-ink-muted">
            <Checkbox name="isActive" defaultChecked={product?.isActive ?? true} /> Te koop in de kassa
          </label>
        </div>
        <div className="flex gap-2">
          {product ? (
            <DeleteButton
              action={() => deleteProductAction(product.id)}
              title={`${product.name} verwijderen?`}
              description="Verkochte bonnen behouden de naam en prijs. Liever tijdelijk niet verkopen? Zet ‘Te koop in de kassa’ uit."
            />
          ) : null}
          <SubmitButton pendingText="Opslaan…">{product ? "Opslaan" : "Product toevoegen"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
