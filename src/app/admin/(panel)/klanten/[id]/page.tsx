import { Mail, Phone, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/admin/customer-form";
import { PageHeader } from "@/components/admin/page-header";
import { DemoBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { capitalize, formatDateShort, formatDateTime, formatPrice, telHref } from "@/lib/format";
import { uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { getCustomerDetail } from "@/server/services/customers";

export const metadata = { title: "Klant" };

export default async function CustomerDetailPage({ params }: PageProps<"/admin/klanten/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const customer = await getCustomerDetail(id);
  if (!customer) notFound();

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/klanten", label: "Alle klanten" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {customer.firstName} {customer.lastName}
            {customer.isDemo ? <DemoBadge /> : null}
          </span>
        }
        description={`Klant sinds ${formatDateTime(customer.createdAt)}`}
        actions={
          <ButtonLink href={`/admin/afspraken/nieuw?klant=${customer.id}`} variant="secondary">
            <Plus className="size-4" aria-hidden /> Afspraak inplannen
          </ButtonLink>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Afspraken", String(customer.history.length)],
          ["Bezoeken", String(customer.visits)],
          ["Besteed", formatPrice(customer.totalSpentCents)],
          ["Favoriete barber", customer.preferredBarberName ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-ink-faint">{label}</p>
            <p className="mt-1 truncate text-xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Afspraakgeschiedenis" />
          {customer.history.length ? (
            <ul className="divide-y divide-line">
              {customer.history.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/afspraken/${a.id}`} className="flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-2">
                    <span>
                      <span className="block text-ink">
                        {capitalize(formatDateShort(a.date))} · {a.startTime.slice(0, 5)}
                      </span>
                      <span className="text-sm text-ink-muted">
                        {a.serviceName} · {a.barberName} · {formatPrice(a.priceCents)}
                      </span>
                    </span>
                    <StatusBadge status={a.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-ink-muted">Nog geen afspraken.</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Contact" />
            <div className="flex flex-wrap gap-2 p-5">
              <ButtonLink href={telHref(customer.phone)} variant="secondary" size="sm">
                <Phone className="size-4" aria-hidden /> Bellen
              </ButtonLink>
              {customer.email ? (
                <ButtonLink href={`mailto:${customer.email}`} variant="secondary" size="sm">
                  <Mail className="size-4" aria-hidden /> E-mailen
                </ButtonLink>
              ) : null}
            </div>
          </Card>
          <Card>
            <CardHeader title="Gegevens" />
            <div className="p-5">
              <CustomerForm customer={customer} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
