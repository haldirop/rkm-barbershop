import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { deleteCashCountAction, purgeCashCountAction } from "@/app/kassa/actions";
import { CashCountForm } from "@/components/kassa/cash-count-form";
import { OwnerDeleteButton, OwnerPurgeButton } from "@/components/kassa/owner-delete";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { capitalize, formatAmount, formatDateLong, formatDateShort, formatDateTime } from "@/lib/format";
import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/pos";
import { addDays, isIsoDate, zonedNow } from "@/lib/time";
import { isOwner, requireAdmin } from "@/server/auth/session";
import { getCashCount, listCashCounts, listDeletedCashCounts, salesSummary } from "@/server/services/pos";

export const metadata = { title: "Dagafsluiting" };

export default async function DayClosingPage({ searchParams }: PageProps<"/kassa/dagafsluiting">) {
  const user = await requireAdmin("/kassa");
  const owner = isOwner(user);
  const today = zonedNow().date;
  const requested = (await searchParams).datum;
  const date = typeof requested === "string" && isIsoDate(requested) && requested <= today ? requested : today;
  const [summary, count, history, deleted] = await Promise.all([
    salesSummary(date, date),
    getCashCount(date),
    listCashCounts(14),
    owner ? listDeletedCashCounts() : [],
  ]);
  const lastFloat = history.find((c) => c.date < date)?.floatCents ?? 0;
  const changedSinceCount = count !== null && count.cashSalesCents !== summary.byMethod.CASH;

  return (
    <div>
      <PageHeader title="Dagafsluiting" description="Dagtotalen en de kas tellen aan het eind van de dag." />

      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href={`/kassa/dagafsluiting?datum=${addDays(date, -1)}`}
          className="grid size-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink"
          aria-label="Vorige dag"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h2 className="text-center text-lg font-semibold text-ink">
          {date === today ? "Vandaag, " : ""}
          {formatDateLong(date, true)}
        </h2>
        {date < today ? (
          <Link
            href={`/kassa/dagafsluiting?datum=${addDays(date, 1)}`}
            className="grid size-10 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink"
            aria-label="Volgende dag"
          >
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className="size-10" aria-hidden />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader
            title="Dagtotaal"
            description={`${summary.receipts} ${summary.receipts === 1 ? "bon" : "bonnen"}${summary.refunds ? ` · ${summary.refunds} tegenboeking(en)` : ""}`}
            action={
              <Link href={`/kassa/bonnen?van=${date}&tot=${date}`} className="text-sm text-gold hover:text-gold-bright">
                Bonnen bekijken
              </Link>
            }
          />
          <dl className="space-y-2 p-5 text-sm">
            <div className="flex justify-between text-base font-semibold">
              <dt className="text-ink">Omzet (incl. btw)</dt>
              <dd className="text-ink tabular-nums">{formatAmount(summary.revenueCents)}</dd>
            </div>
            {summary.vat.map((v) => (
              <div key={v.rate} className="flex justify-between text-ink-muted">
                <dt>
                  Btw {v.rate}% over {formatAmount(v.grossCents)}
                </dt>
                <dd className="tabular-nums">{formatAmount(v.vatCents)}</dd>
              </div>
            ))}
            <div className="flex justify-between text-ink-muted">
              <dt>Fooi (geen omzet)</dt>
              <dd className="tabular-nums">{formatAmount(summary.tipsCents)}</dd>
            </div>
            <div className="!mt-4 border-t border-line pt-3" />
            {(Object.keys(PAYMENT_METHODS) as PaymentMethodKey[]).map((m) => (
              <div key={m} className="flex justify-between">
                <dt className="text-ink-muted">{PAYMENT_METHODS[m]}</dt>
                <dd className="text-ink tabular-nums">{formatAmount(summary.byMethod[m])}</dd>
              </div>
            ))}
            <div className="flex justify-between font-semibold">
              <dt className="text-ink">Totaal ontvangen</dt>
              <dd className="text-ink tabular-nums">{formatAmount(summary.receivedCents)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Kas tellen"
            description={
              count
                ? `Laatst geteld op ${formatDateTime(count.updatedAt)}${count.countedBy ? ` door ${count.countedBy}` : ""}.`
                : "Tel het geld in de kas en vul het bedrag in."
            }
          />
          <div className="space-y-4 p-5">
            {changedSinceCount ? (
              <Alert tone="warning">
                Na het tellen is het contante bedrag veranderd ({formatAmount(count.cashSalesCents)} →{" "}
                {formatAmount(summary.byMethod.CASH)}). Tel de kas opnieuw.
              </Alert>
            ) : null}
            <CashCountForm
              key={`${date}-${count?.updatedAt.toISOString() ?? "new"}`}
              date={date}
              cashSalesCents={summary.byMethod.CASH}
              defaultFloatCents={count?.floatCents ?? lastFloat}
              defaultCountedCents={count?.countedCents ?? null}
              defaultNote={count?.note ?? null}
            />
            {owner && count ? (
              <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-faint">Alleen jij als eigenaar kunt een kastelling verwijderen.</p>
                <OwnerDeleteButton
                  label="Kastelling verwijderen"
                  title={`Kastelling van ${formatDateLong(date)} verwijderen?`}
                  description="De dag staat daarna weer als ‘niet geteld’ en je kunt opnieuw tellen. De bonnen en de omzet van die dag blijven gewoon staan."
                  keptIn="‘Verwijderde kastellingen’"
                  placeholder="Bijv. verkeerd geteld, test"
                  action={deleteCashCountAction.bind(null, count.id)}
                />
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <section aria-labelledby="history-title" className="mt-8">
        <h2 id="history-title" className="mb-3 text-lg font-semibold text-ink">
          Eerdere kastellingen
        </h2>
        {history.length ? (
          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[32rem] text-sm">
              <thead className="text-left text-ink-faint">
                <tr>
                  <th className="px-5 py-3 font-medium">Dag</th>
                  <th className="px-5 py-3 text-right font-medium">Hoort in de kas</th>
                  <th className="px-5 py-3 text-right font-medium">Geteld</th>
                  <th className="px-5 py-3 text-right font-medium">Verschil</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {history.map((c) => {
                  const expected = c.floatCents + c.cashSalesCents;
                  const difference = c.countedCents - expected;
                  return (
                    <tr key={c.date} className="border-t border-line">
                      <td className="px-5 py-3">
                        <Link href={`/kassa/dagafsluiting?datum=${c.date}`} className="text-ink hover:text-gold-bright">
                          {capitalize(formatDateShort(c.date))}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right text-ink">{formatAmount(expected)}</td>
                      <td className="px-5 py-3 text-right text-ink">{formatAmount(c.countedCents)}</td>
                      <td className={cn("px-5 py-3 text-right", difference === 0 ? "text-emerald-300" : "text-amber-300")}>
                        {difference > 0 ? "+" : ""}
                        {formatAmount(difference)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Nog geen kastellingen.</p>
        )}
      </section>

      {deleted.length ? (
        <section aria-labelledby="deleted-counts-title" className="mt-8">
          <h2 id="deleted-counts-title" className="mb-1 text-lg font-semibold text-ink">
            Verwijderde kastellingen
          </h2>
          <p className="mb-3 text-sm text-ink-muted">Alleen zichtbaar voor de eigenaar. Ze tellen nergens meer mee.</p>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {deleted.map((c) => {
              const difference = c.countedCents - (c.floatCents + c.cashSalesCents);
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium text-ink-muted line-through">
                      {capitalize(formatDateShort(c.date))} · geteld {formatAmount(c.countedCents)} ({difference > 0 ? "+" : ""}
                      {formatAmount(difference)})
                    </span>
                    <span className="block text-ink-faint">
                      {c.deletedAt ? formatDateTime(c.deletedAt) : ""}
                      {c.deletedBy ? ` · ${c.deletedBy}` : ""} · {c.deleteReason}
                    </span>
                  </span>
                  <OwnerPurgeButton
                    compact
                    title={`Kastelling van ${formatDateLong(c.date)} definitief verwijderen?`}
                    description="De kastelling wordt helemaal gewist, ook uit ‘Verwijderde kastellingen’. Dit kan niet ongedaan worden gemaakt."
                    action={purgeCashCountAction.bind(null, c.id)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
