import { Download, Receipt } from "lucide-react";
import Link from "next/link";
import { KassaTabs } from "@/components/admin/pos/kassa-tabs";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { capitalize, formatAmount, formatDateLong, formatDateShort } from "@/lib/format";
import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/pos";
import { addDays, addMonths, diffInDays, endOfMonth, isIsoDate, startOfMonth, startOfWeek, zonedNow } from "@/lib/time";
import { requireAdmin } from "@/server/auth/session";
import { listSales, salesSummary } from "@/server/services/pos";

export const metadata = { title: "Bonnen & omzet" };

const shopTime = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

function period(params: Record<string, string | string[] | undefined>, today: string) {
  const from = typeof params.van === "string" && isIsoDate(params.van) ? params.van : today;
  const to = typeof params.tot === "string" && isIsoDate(params.tot) ? params.tot : from;
  // At most a little over a year at once, and never backwards.
  if (to < from || diffInDays(from, to) > 400) return { from, to: from };
  return { from, to };
}

export default async function SalesPage({ searchParams }: PageProps<"/admin/kassa/bonnen">) {
  await requireAdmin();
  const today = zonedNow().date;
  const { from, to } = period(await searchParams, today);
  const [summary, receipts] = await Promise.all([salesSummary(from, to), listSales(from, to)]);

  const lastMonth = addMonths(startOfMonth(today), -1);
  const presets = [
    { label: "Vandaag", from: today, to: today },
    { label: "Gisteren", from: addDays(today, -1), to: addDays(today, -1) },
    { label: "Deze week", from: startOfWeek(today), to: today },
    { label: "Deze maand", from: startOfMonth(today), to: today },
    { label: "Vorige maand", from: lastMonth, to: endOfMonth(lastMonth) },
  ];
  const title =
    from === to ? capitalize(formatDateLong(from, true)) : `${formatDateShort(from)} t/m ${formatDateShort(to)}`;

  const stats = [
    { label: "Omzet", value: formatAmount(summary.revenueCents), hint: "incl. btw, zonder fooi" },
    { label: "Bonnen", value: String(summary.receipts), hint: summary.refunds ? `+ ${summary.refunds} tegenboeking(en)` : "verkopen" },
    { label: "Fooi", value: formatAmount(summary.tipsCents), hint: "geen omzet" },
    { label: "Korting", value: formatAmount(summary.discountsCents), hint: "gegeven" },
  ];

  return (
    <div>
      <PageHeader
        title="Kassa"
        description="Omzet, btw en alle bonnen per periode."
        actions={
          <ButtonLink href={`/admin/kassa/export?van=${from}&tot=${to}`} variant="secondary">
            <Download className="size-4" aria-hidden /> Exporteren (CSV)
          </ButtonLink>
        }
      />
      <KassaTabs active="bonnen" />

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Link
              key={p.label}
              href={`/admin/kassa/bonnen?van=${p.from}&tot=${p.to}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                p.from === from && p.to === to ? "border-gold bg-gold/10 text-gold-bright" : "border-line-strong text-ink-muted hover:text-ink",
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-2" action="/admin/kassa/bonnen">
          <label className="flex flex-col text-sm text-ink-muted">
            Van
            <Input type="date" name="van" defaultValue={from} className="mt-1 h-10 w-auto" />
          </label>
          <label className="flex flex-col text-sm text-ink-muted">
            Tot en met
            <Input type="date" name="tot" defaultValue={to} className="mt-1 h-10 w-auto" />
          </label>
          <Button type="submit" variant="secondary" className="h-10">
            Toon
          </Button>
        </form>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>

      <section aria-label="Kerncijfers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <p className="text-sm text-ink-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-xs text-ink-faint">{s.hint}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Btw" description="Bedragen na korting." />
          <div className="overflow-x-auto p-5">
            <table className="w-full text-sm">
              <thead className="text-left text-ink-faint">
                <tr>
                  <th className="pb-2 font-medium">Tarief</th>
                  <th className="pb-2 text-right font-medium">Incl. btw</th>
                  <th className="pb-2 text-right font-medium">Btw</th>
                  <th className="pb-2 text-right font-medium">Excl. btw</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {summary.vat.length ? (
                  summary.vat.map((v) => (
                    <tr key={v.rate} className="border-t border-line">
                      <td className="py-2 text-ink">{v.rate}%</td>
                      <td className="py-2 text-right text-ink">{formatAmount(v.grossCents)}</td>
                      <td className="py-2 text-right text-ink">{formatAmount(v.vatCents)}</td>
                      <td className="py-2 text-right text-ink">{formatAmount(v.netCents)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-line">
                    <td colSpan={4} className="py-3 text-ink-muted">
                      Geen verkopen in deze periode.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ontvangen per betaalwijze" description="Inclusief fooi." />
          <dl className="space-y-2 p-5 text-sm">
            {(Object.keys(PAYMENT_METHODS) as PaymentMethodKey[]).map((m) => (
              <div key={m} className="flex justify-between">
                <dt className="text-ink-muted">{PAYMENT_METHODS[m]}</dt>
                <dd className="text-ink tabular-nums">{formatAmount(summary.byMethod[m])}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <dt className="text-ink">Totaal ontvangen</dt>
              <dd className="text-ink tabular-nums">{formatAmount(summary.receivedCents)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader title="Per behandeling en product" />
          <div className="p-5">
            {summary.items.length ? (
              <table className="w-full text-sm">
                <tbody className="tabular-nums">
                  {summary.items.map((item) => (
                    <tr key={`${item.kind}-${item.name}`} className="border-t border-line first:border-0">
                      <td className="py-2 text-ink">{item.name}</td>
                      <td className="py-2 text-right text-ink-muted">{item.quantity}×</td>
                      <td className="py-2 text-right text-ink">{formatAmount(item.revenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-ink-muted">Nog niets verkocht in deze periode.</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Per barber" description="Omzet zonder fooi." />
          <dl className="space-y-2 p-5 text-sm">
            {summary.byBarber.length ? (
              summary.byBarber.map((b) => (
                <div key={b.barberName ?? "-"} className="flex justify-between">
                  <dt className="text-ink-muted">{b.barberName ?? "Geen barber"}</dt>
                  <dd className="text-ink tabular-nums">{formatAmount(b.revenueCents)}</dd>
                </div>
              ))
            ) : (
              <p className="text-ink-muted">Nog niets verkocht in deze periode.</p>
            )}
          </dl>
        </Card>
      </div>

      <section aria-labelledby="receipts-title" className="mt-8">
        <h2 id="receipts-title" className="mb-3 text-lg font-semibold text-ink">
          Bonnen
        </h2>
        {receipts.length ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {receipts.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/kassa/bonnen/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 text-sm transition-colors hover:bg-surface-2"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 font-medium text-ink">
                      Bon {r.number}
                      {r.kind === "REFUND" ? (
                        <Badge className="bg-red-400/10 text-red-300 ring-red-400/30">Tegenboeking</Badge>
                      ) : r.refundedBy ? (
                        <Badge className="bg-zinc-400/10 text-zinc-300 ring-zinc-400/30">Teruggedraaid</Badge>
                      ) : null}
                    </span>
                    <span className="block truncate text-ink-muted">
                      {from === to ? "" : `${formatDateShort(r.date)} · `}
                      {shopTime.format(r.createdAt)} · {r.lineNames ?? "—"}
                      {r.firstName ? ` · ${r.firstName} ${r.lastName}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-ink-muted">{PAYMENT_METHODS[r.paymentMethod]}</span>
                    <span className={cn("font-semibold tabular-nums", r.totalCents < 0 ? "text-red-300" : "text-ink")}>
                      {formatAmount(r.totalCents)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Receipt className="size-8" />} title="Geen bonnen in deze periode">
            Afgerekende afspraken en verkopen verschijnen hier.
          </EmptyState>
        )}
      </section>
    </div>
  );
}
