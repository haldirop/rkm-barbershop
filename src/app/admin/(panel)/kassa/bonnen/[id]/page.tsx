import { Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KassaTabs } from "@/components/admin/pos/kassa-tabs";
import { ReceiptView } from "@/components/admin/pos/receipt";
import { EmailReceipt, RefundButton } from "@/components/admin/pos/receipt-actions";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { formatAmount, formatDateTime } from "@/lib/format";
import { uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { getSale } from "@/server/services/pos";
import { getSettings } from "@/server/services/settings";

export const metadata = { title: "Bon" };

export default async function ReceiptPage({ params }: PageProps<"/admin/kassa/bonnen/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const [detail, settings] = await Promise.all([getSale(id), getSettings()]);
  if (!detail) notFound();
  const { sale, customer } = detail;

  return (
    <div>
      <PageHeader
        back={{ href: `/admin/kassa/bonnen?van=${sale.date}&tot=${sale.date}`, label: "Bonnen" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Bon {sale.number}
            {sale.kind === "REFUND" ? (
              <Badge className="bg-red-400/10 text-red-300 ring-red-400/30">Tegenboeking</Badge>
            ) : detail.refundedBy ? (
              <Badge className="bg-zinc-400/10 text-zinc-300 ring-zinc-400/30">Teruggedraaid</Badge>
            ) : null}
          </span>
        }
        description={`${formatDateTime(sale.createdAt)} · ${formatAmount(sale.totalCents)}`}
        actions={
          <ButtonLink href={`/admin/bon/${sale.id}?print=1`} target="_blank" variant="secondary">
            <Printer className="size-4" aria-hidden /> Printen
          </ButtonLink>
        }
      />
      <KassaTabs active="bonnen" />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Gegevens" />
            <dl className="grid gap-x-8 gap-y-4 p-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-faint">Klant</dt>
                <dd className="mt-0.5 text-ink">
                  {customer ? (
                    <Link href={`/admin/klanten/${customer.id}`} className="hover:text-gold-bright">
                      {customer.firstName} {customer.lastName}
                    </Link>
                  ) : (
                    "Losse verkoop"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">Afspraak</dt>
                <dd className="mt-0.5 text-ink">
                  {sale.appointmentId ? (
                    <Link href={`/admin/afspraken/${sale.appointmentId}`} className="hover:text-gold-bright">
                      Afspraak bekijken
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-faint">Afgerekend door</dt>
                <dd className="mt-0.5 text-ink">{detail.cashier ?? "—"}</dd>
              </div>
              {sale.note ? (
                <div>
                  <dt className="text-ink-faint">{sale.kind === "REFUND" ? "Reden" : "Opmerking"}</dt>
                  <dd className="mt-0.5 text-ink">{sale.note}</dd>
                </div>
              ) : null}
              {detail.refundedBy ? (
                <div>
                  <dt className="text-ink-faint">Teruggedraaid met</dt>
                  <dd className="mt-0.5">
                    <Link href={`/admin/kassa/bonnen/${detail.refundedBy.id}`} className="text-gold hover:text-gold-bright">
                      Bon {detail.refundedBy.number}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {detail.refundOf ? (
                <div>
                  <dt className="text-ink-faint">Draait terug</dt>
                  <dd className="mt-0.5">
                    <Link href={`/admin/kassa/bonnen/${detail.refundOf.id}`} className="text-gold hover:text-gold-bright">
                      Bon {detail.refundOf.number}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Bon mailen" description="Stuur de bon (opnieuw) naar de klant." />
            <div className="p-5">
              <EmailReceipt saleId={sale.id} defaultEmail={customer?.email ?? null} />
            </div>
          </Card>

          {sale.kind === "SALE" && !detail.refundedBy ? (
            <Card>
              <CardHeader
                title="Fout gemaakt?"
                description="Een bon kun je niet wijzigen of verwijderen. Draai hem terug met een tegenboeking en reken daarna opnieuw af."
              />
              <div className="p-5">
                <RefundButton saleId={sale.id} number={sale.number} total={formatAmount(sale.totalCents)} />
              </div>
            </Card>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-line">
          <ReceiptView detail={detail} settings={settings} />
        </div>
      </div>
    </div>
  );
}
