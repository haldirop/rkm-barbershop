import { Package } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { listProducts } from "@/server/services/catalog";

export const metadata = { title: "Producten" };

export default async function ProductsPage() {
  await requireAdmin();
  const products = await listProducts();
  return (
    <div>
      <PageHeader
        title="Producten"
        description="Wat je naast de behandelingen verkoopt, zoals wax of shampoo. Producten verschijnen direct in de kassa."
      />
      {products.length ? (
        <div className="space-y-4">
          {products.map((product) => (
            <details key={product.id} className="group rounded-2xl border border-line bg-surface open:border-line-strong">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-ink">{product.name}</span>
                  {!product.isActive ? <Badge className="bg-zinc-400/10 text-zinc-300 ring-zinc-400/30">Niet te koop</Badge> : null}
                  {product.stock !== null && product.stock <= 0 ? (
                    <Badge className="bg-red-400/10 text-red-300 ring-red-400/30">Op</Badge>
                  ) : null}
                </span>
                <span className="flex items-center gap-4 text-sm text-ink-muted">
                  {product.stock !== null ? <span>{product.stock} op voorraad</span> : null}
                  <span className="font-semibold text-gold-bright tabular-nums">{formatAmount(product.priceCents)}</span>
                  <span className="text-gold group-open:hidden">Bewerken</span>
                </span>
              </summary>
              <div className="border-t border-line p-5">
                <ProductForm product={product} />
              </div>
            </details>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Package className="size-8" />} title="Nog geen producten">
          Voeg hieronder je eerste product toe. Het staat dan meteen in de kassa.
        </EmptyState>
      )}

      <section className="mt-10 rounded-2xl border border-dashed border-line-strong p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold text-ink">Nieuw product toevoegen</h2>
        <p className="mb-5 text-sm text-ink-muted">
          Prijzen zijn inclusief btw. Voor verkochte producten geldt meestal 21% btw; vraag het bij twijfel aan je boekhouder.
        </p>
        <ProductForm />
      </section>
    </div>
  );
}
