import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/service-form";
import { Badge } from "@/components/ui/badge";
import { formatDuration, formatPrice } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { listServices } from "@/server/services/catalog";

export const metadata = { title: "Diensten" };

export default async function ServicesPage() {
  await requireAdmin();
  const services = await listServices();
  return (
    <div>
      <PageHeader
        title="Diensten"
        description="Behandelingen, prijzen en duur. Wijzigingen zijn direct zichtbaar op de website en in de agenda."
      />
      <div className="space-y-4">
        {services.map((service) => (
          <details key={service.id} className="group rounded-2xl border border-line bg-surface open:border-line-strong">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-ink">{service.name}</span>
                {!service.isActive ? <Badge className="bg-zinc-400/10 text-zinc-300 ring-zinc-400/30">Verborgen</Badge> : null}
              </span>
              <span className="flex items-center gap-4 text-sm text-ink-muted">
                <span>{formatDuration(service.durationMinutes)}</span>
                <span className="font-semibold text-gold-bright tabular-nums">{formatPrice(service.priceCents)}</span>
                <span className="text-gold group-open:hidden">Bewerken</span>
              </span>
            </summary>
            <div className="border-t border-line p-5">
              <ServiceForm service={service} />
            </div>
          </details>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-dashed border-line-strong p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold text-ink">Nieuwe dienst toevoegen</h2>
        <ServiceForm />
      </section>
    </div>
  );
}
