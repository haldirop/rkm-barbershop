import { BellRing, Mail, Package, Phone, UserX } from "lucide-react";
import Link from "next/link";
import { BarChart, Heatmap, StackedBarChart } from "@/components/admin/charts";
import { Delta, MeterList, StatTile } from "@/components/admin/insight-ui";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { capitalize, formatAmount, formatDateLong, formatDateShort, formatMonth, telHref, weekdayName } from "@/lib/format";
import { isoWeekNumber, rhythmLabel } from "@/lib/insights";
import { addDays, isoWeekday, startOfMonth, startOfWeek, zonedNow } from "@/lib/time";
import { requireAdmin } from "@/server/auth/session";
import {
  busyTimes,
  customerInsights,
  firstSaleDate,
  noShowInsights,
  occupancy,
  productInsights,
  revenueOverview,
  revenueSeries,
  waitlistDemand,
} from "@/server/services/insights";

export const metadata = { title: "Inzichten" };

const SECTIONS = [
  ["omzet", "Omzet"],
  ["drukte", "Drukte"],
  ["klanten", "Klanten"],
  ["niet-verschenen", "Niet verschenen"],
  ["producten", "Producten"],
] as const;

const ago = (days: number) => (days < 14 ? `${days} dagen geleden` : `${Math.round(days / 7)} weken geleden`);
const clock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function SectionTitle({ id, title, intro }: { id: string; title: string; intro: string }) {
  return (
    <div className="mb-4">
      <h2 id={id} className="scroll-mt-24 text-xl font-semibold text-ink">
        {title}
      </h2>
      <p className="mt-0.5 text-sm text-ink-muted">{intro}</p>
    </div>
  );
}

export default async function InsightsPage({ searchParams }: PageProps<"/admin/inzichten">) {
  await requireAdmin();
  const now = zonedNow();
  const period = (await searchParams).omzet === "maand" ? "month" : "week";

  const [overview, series, firstSale, busy, lastWeeks, nextWeek, waitlist, customers, noShows, productInfo] = await Promise.all([
    revenueOverview(now),
    revenueSeries(period, 12, now),
    firstSaleDate(),
    busyTimes(addDays(now.date, -84), now.date, now),
    occupancy(addDays(now.date, -28), addDays(now.date, -1)),
    occupancy(now.date, addDays(now.date, 6)),
    waitlistDemand(now),
    customerInsights(now),
    noShowInsights(90, now),
    productInsights(90, now),
  ]);

  // Periods before the till was taken into use have no data, not zero revenue.
  const firstPeriod = firstSale ? (period === "week" ? startOfWeek(firstSale) : startOfMonth(firstSale)) : null;
  const shownSeries = series.filter((p) => !firstPeriod || p.start >= firstPeriod);
  const revenueData = shownSeries.map((p, i) => {
    const current = i === shownSeries.length - 1;
    if (period === "week") {
      return {
        key: p.start,
        label: `w${isoWeekNumber(p.start)}`,
        title: `Week ${isoWeekNumber(p.start)} (${formatDateShort(p.start)} – ${formatDateShort(addDays(p.start, 6))})`,
        value: p.revenueCents,
        note: current ? "Deze week, tot nu toe" : undefined,
      };
    }
    return {
      key: p.start,
      label: formatMonth(p.start).slice(0, 3),
      title: capitalize(formatMonth(p.start)),
      value: p.revenueCents,
      note: current ? "Deze maand, tot nu toe" : undefined,
    };
  });
  const busiestWaitDays = [...waitlist.days].sort((a, b) => b.waiting - a.waiting).slice(0, 5);

  return (
    <div className="space-y-12">
      <div>
        <PageHeader title="Inzichten" description="Hoe het bedrijf draait: omzet, drukte, klanten en producten." />
        <nav aria-label="Onderdelen" className="flex flex-wrap gap-2">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-line-strong px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-gold/50 hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      {/* Omzet */}
      <section aria-labelledby="omzet">
        <SectionTitle
          id="omzet"
          title="Omzet"
          intro={`Wat er in de kassa is afgerekend, inclusief btw en zonder fooi${firstSale ? `, sinds ${formatDateLong(firstSale, true)}` : ""}.`}
        />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Vandaag"
            value={formatAmount(overview.today.current.revenueCents)}
            footer={<Delta change={overview.today.change} versus={`vorige ${weekdayName(isoWeekday(now.date))}`} />}
          />
          <StatTile
            label="Deze week"
            value={formatAmount(overview.week.current.revenueCents)}
            footer={<Delta change={overview.week.change} versus="vorige week" />}
          />
          <StatTile
            label="Deze maand"
            value={formatAmount(overview.month.current.revenueCents)}
            footer={<Delta change={overview.month.change} versus="vorige maand" />}
          />
          <StatTile
            label="Gemiddeld per bon"
            value={formatAmount(overview.averageReceipt.current)}
            footer={<Delta change={overview.averageReceipt.change} versus="vorige maand" />}
          />
        </div>
        <Card className="mt-4">
          <CardHeader
            title={period === "week" ? "Omzet per week" : "Omzet per maand"}
            description={
              shownSeries.length === series.length
                ? `De laatste ${series.length} ${period === "week" ? "weken" : "maanden"}.`
                : `Sinds de eerste kassabon.`
            }
            action={
              <div className="flex shrink-0 rounded-full border border-line-strong p-0.5 text-sm" role="group" aria-label="Periode">
                {(["week", "maand"] as const).map((p) => {
                  const selected = (p === "week") === (period === "week");
                  return (
                    <Link
                      key={p}
                      href={`/admin/inzichten?omzet=${p}#omzet`}
                      aria-current={selected ? "true" : undefined}
                      className={cn("rounded-full px-3 py-1", selected ? "bg-gold text-canvas" : "text-ink-muted hover:text-ink")}
                    >
                      Per {p}
                    </Link>
                  );
                })}
              </div>
            }
          />
          <div className="p-5">
            {firstSale ? (
              <BarChart data={revenueData} unit="euro" caption={period === "week" ? "Omzet per week" : "Omzet per maand"} />
            ) : (
              <p className="text-sm text-ink-muted">Nog geen kassabonnen. Zodra je afrekent in de kassa, verschijnt hier het verloop.</p>
            )}
          </div>
        </Card>
      </section>

      {/* Drukte */}
      <section aria-labelledby="drukte">
        <SectionTitle id="drukte" title="Drukte" intro="Wanneer klanten komen en hoe vol de agenda zit. Handig voor openingstijden en pauzes." />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader
              title="Drukste momenten"
              description={`Klanten per uur over de laatste 12 weken: afspraken die doorgingen en binnenlopers uit de kassa (${busy.total} in totaal).`}
            />
            <div className="p-5">
              {busy.total ? (
                <Heatmap
                  weekdays={busy.weekdays}
                  hours={busy.hours}
                  counts={busy.counts}
                  max={busy.max}
                  openHours={busy.openHours}
                  caption="Klanten per dag en uur"
                />
              ) : (
                <p className="text-sm text-ink-muted">Nog geen gegevens.</p>
              )}
              {busy.outsideHours ? (
                <p className="mt-2 text-xs text-ink-faint">
                  {busy.outsideHours} {busy.outsideHours === 1 ? "moment valt" : "momenten vallen"} buiten de openingstijden en{" "}
                  {busy.outsideHours === 1 ? "staat" : "staan"} niet in het overzicht (bijvoorbeeld een bon die later is ingevoerd).
                </p>
              ) : null}
            </div>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Bezetting afgelopen 4 weken"
                description="Geboekte tijd ten opzichte van de werktijd van alle barbers (pauzes en blokkades niet meegeteld)."
              />
              <div className="space-y-4 p-5">
                <p className="text-3xl font-semibold text-ink">{lastWeeks.percent ?? 0}%</p>
                <MeterList
                  rows={lastWeeks.byWeekday.map((d) => ({ key: String(d.weekday), label: capitalize(weekdayName(d.weekday)), percent: d.percent }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Komende 7 dagen" description="Hoeveel er al geboekt is (aanvragen en bevestigd)." />
              <div className="space-y-4 p-5">
                <p className="text-3xl font-semibold text-ink">{nextWeek.percent ?? 0}%</p>
                <MeterList rows={nextWeek.byDay.map((d) => ({ key: d.date, label: capitalize(formatDateShort(d.date)), percent: d.percent }))} />
              </div>
            </Card>
          </div>
        </div>
        <Card className="mt-4">
          <CardHeader
            title="Vraag op volle dagen"
            description="Mensen op de wachtlijst voor een volgeboekte dag. Veel aanmeldingen op dezelfde dagen? Dan is daar vraag naar extra uren."
            action={
              <Link href="/admin/wachtlijst" className="shrink-0 text-sm text-gold hover:text-gold-bright">
                Wachtlijst
              </Link>
            }
          />
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3 text-ink">
              <BellRing className="size-5 shrink-0 text-gold" aria-hidden />
              {waitlist.people
                ? `${waitlist.people} ${waitlist.people === 1 ? "persoon wacht" : "mensen wachten"} op een plek op ${waitlist.days.length} ${waitlist.days.length === 1 ? "dag" : "dagen"}.`
                : "Op dit moment staat niemand op de wachtlijst."}
            </p>
            {busiestWaitDays.length ? (
              <ul className="flex flex-wrap gap-2 text-sm">
                {busiestWaitDays.map((d) => (
                  <li key={d.date} className="rounded-full border border-line-strong px-3 py-1 text-ink-muted">
                    {capitalize(formatDateShort(d.date))} · <span className="text-ink tabular-nums">{d.waiting}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      </section>

      {/* Klanten */}
      <section aria-labelledby="klanten">
        <SectionTitle id="klanten" title="Klanten" intro="Op basis van afspraken die zijn doorgegaan." />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatTile label="Klanten afgelopen 90 dagen" value={String(customers.activeCustomers)} />
          <StatTile label="Vaste klanten" value={String(customers.regulars)} footer={<span className="text-ink-faint">2 of meer bezoeken</span>} />
          <StatTile
            label="Vaste klanten komen"
            value={customers.medianGapDays === null ? "—" : rhythmLabel(customers.medianGapDays)}
            footer={<span className="text-ink-faint">gemiddeld (mediaan)</span>}
          />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Nieuwe en terugkerende klanten" description="Per maand, de laatste 6 maanden." />
            <div className="p-5">
              <StackedBarChart
                caption="Nieuwe en terugkerende klanten per maand"
                unit="count"
                series={["Terugkerend", "Nieuw"]}
                data={customers.months.map((m) => ({
                  key: m.month,
                  label: formatMonth(m.month).slice(0, 3),
                  title: capitalize(formatMonth(m.month)),
                  values: [m.returning, m.newCustomers],
                }))}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Beste klanten" description="Meeste bezoeken in de laatste 12 maanden, met wat ze in de kassa besteedden." />
            {customers.top.length ? (
              <ol className="divide-y divide-line">
                {customers.top.map((c, i) => (
                  <li key={c.id}>
                    <Link href={`/admin/klanten/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-surface-2">
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="w-5 text-ink-faint tabular-nums">{i + 1}</span>
                        <span className="truncate text-ink">
                          {c.firstName} {c.lastName}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-4 text-ink-muted tabular-nums">
                        <span>{c.visits}× geweest</span>
                        <span className="w-20 text-right text-ink">{formatAmount(c.spentCents)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-5 text-sm text-ink-muted">Nog geen gegevens.</p>
            )}
          </Card>
        </div>
        <Card className="mt-4">
          <CardHeader
            title="Tijd voor een nieuwe afspraak"
            description="Vaste klanten die duidelijk later zijn dan normaal en nog niets gepland hebben. Een berichtje kan helpen."
          />
          {customers.due.length ? (
            <ul className="divide-y divide-line">
              {customers.due.map((c) => (
                <li key={c.id} className="flex flex-col gap-3 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link href={`/admin/klanten/${c.id}`} className="font-medium text-ink hover:text-gold-bright">
                      {c.firstName} {c.lastName}
                    </Link>
                    <p className="text-ink-muted">
                      Laatst geweest {ago(c.daysSince)} ({formatDateShort(c.lastVisit)}) · komt meestal {rhythmLabel(c.averageGapDays)} ·{" "}
                      {c.visits}× geweest
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <ButtonLink href={telHref(c.phone)} variant="secondary" size="sm">
                      <Phone className="size-4" aria-hidden /> Bellen
                    </ButtonLink>
                    {c.email ? (
                      <ButtonLink href={`mailto:${c.email}`} variant="secondary" size="sm">
                        <Mail className="size-4" aria-hidden /> Mailen
                      </ButtonLink>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-5 text-sm text-ink-muted">Iedereen is op tijd, of er zijn nog te weinig gegevens.</p>
          )}
        </Card>
      </section>

      {/* Niet verschenen */}
      <section aria-labelledby="niet-verschenen">
        <SectionTitle
          id="niet-verschenen"
          title="Niet verschenen"
          intro="Markeer een afspraak waarbij de klant niet kwam met de knop ‘Niet verschenen’ bij de afspraak."
        />
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <StatTile
            label={`Afgelopen ${noShows.days} dagen`}
            icon={<UserX className="size-4 text-orange-300" aria-hidden />}
            value={noShows.percent === null ? "—" : `${String(noShows.percent).replace(".", ",")}%`}
            footer={
              <span className="text-ink-faint">
                {noShows.noShows} van {noShows.expected} afspraken niet verschenen
              </span>
            }
          />
          <Card>
            <CardHeader title="Vaker niet verschenen" description="Klanten die 2 keer of vaker niet kwamen." />
            {noShows.frequent.length ? (
              <ul className="divide-y divide-line">
                {noShows.frequent.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/klanten/${c.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-surface-2">
                      <span className="truncate text-ink">
                        {c.firstName} {c.lastName}
                      </span>
                      <span className="shrink-0 text-ink-muted">
                        <span className="text-orange-300 tabular-nums">{c.noShows}×</span> · laatst {formatDateShort(c.lastNoShow)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-sm text-ink-muted">Niemand is vaker dan één keer weggebleven.</p>
            )}
          </Card>
        </div>
      </section>

      {/* Producten */}
      <section aria-labelledby="producten">
        <SectionTitle id="producten" title="Producten" intro="Wat goed verkoopt en wat bijna op is." />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Best verkocht" description={`De laatste ${productInfo.days} dagen.`} />
            {productInfo.bestSellers.length ? (
              <ol className="divide-y divide-line">
                {productInfo.bestSellers.map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-5 text-ink-faint tabular-nums">{i + 1}</span>
                      <span className="truncate text-ink">{p.name}</span>
                    </span>
                    <span className="flex shrink-0 gap-4 text-ink-muted tabular-nums">
                      <span>{p.quantity}×</span>
                      <span className="w-20 text-right text-ink">{formatAmount(p.revenueCents)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="p-5 text-sm text-ink-muted">Nog geen producten verkocht.</p>
            )}
          </Card>
          <Card>
            <CardHeader
              title="Bijna op"
              description="Producten op of onder hun meldingsniveau."
              action={
                <Link href="/kassa/producten" className="shrink-0 text-sm text-gold hover:text-gold-bright">
                  Producten
                </Link>
              }
            />
            {productInfo.attention.length ? (
              <ul className="divide-y divide-line">
                {productInfo.attention.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="truncate text-ink">{p.name}</span>
                    {p.status === "out" ? (
                      <Badge className="bg-red-400/10 text-red-300 ring-red-400/30">Op</Badge>
                    ) : (
                      <Badge className="bg-amber-400/10 text-amber-300 ring-amber-400/30">Nog {p.stock}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5">
                <EmptyState icon={<Package className="size-7" />} title="Alles op voorraad">
                  Geef een product een meldingsniveau onder Kassa → Producten om hier een waarschuwing te krijgen.
                </EmptyState>
              </div>
            )}
          </Card>
        </div>
      </section>

      <p className="text-xs text-ink-faint">
        Bijgewerkt op {formatDateLong(now.date, true)} om {clock(now.minutes)}.
      </p>
    </div>
  );
}
