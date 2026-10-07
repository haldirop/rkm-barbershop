import { CalendarX, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { StatusActions } from "@/components/admin/status-actions";
import { DemoBadge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { capitalize, formatDateShort, formatDateTime } from "@/lib/format";
import { APPOINTMENT_STATUSES, STATUS_META, type AppointmentStatus } from "@/lib/status";
import { requireAdmin } from "@/server/auth/session";
import { countByStatus, listAppointments } from "@/server/services/appointments";

export const metadata = { title: "Afspraken" };

type Scope = "upcoming" | "past" | "all";
const SCOPES: Array<[Scope, string]> = [
  ["upcoming", "Komend"],
  ["past", "Verleden"],
  ["all", "Alles"],
];

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppointmentsPage({ searchParams }: PageProps<"/admin/afspraken">) {
  await requireAdmin();
  const params = await searchParams;
  const statusParam = one(params.status);
  const status = APPOINTMENT_STATUSES.includes(statusParam as AppointmentStatus)
    ? (statusParam as AppointmentStatus)
    : undefined;
  const scopeParam = one(params.periode);
  const scope: Scope = scopeParam === "past" || scopeParam === "all" ? scopeParam : "upcoming";
  const q = one(params.q)?.slice(0, 100) ?? "";
  const page = Math.max(1, Number(one(params.pagina)) || 1);

  const [result, counts] = await Promise.all([
    listAppointments({ status, scope, q, page }),
    countByStatus(),
  ]);

  const href = (overrides: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams();
    const merged = { status, periode: scope, q: q || undefined, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== "" && !(key === "periode" && value === "upcoming")) next.set(key, String(value));
    }
    const query = next.toString();
    return query ? `/admin/afspraken?${query}` : "/admin/afspraken";
  };

  const tabs: Array<[AppointmentStatus | undefined, string, number | null]> = [
    [undefined, "Alle", null],
    ...APPOINTMENT_STATUSES.map(
      (s) => [s, STATUS_META[s].plural, s === "PENDING" ? counts.PENDING : null] as [AppointmentStatus, string, number | null],
    ),
  ];

  return (
    <div>
      <AutoRefresh seconds={60} />
      <PageHeader
        title="Afspraken"
        description="Alle aanvragen en afspraken op één plek."
        actions={
          <ButtonLink href="/admin/afspraken/nieuw">
            <Plus className="size-4" aria-hidden /> Nieuwe afspraak
          </ButtonLink>
        }
      />

      <nav aria-label="Status" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {tabs.map(([value, label, badge]) => {
          const active = value === status;
          return (
            <Link
              key={label}
              href={href({ status: value, pagina: undefined })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                active ? "border-gold bg-gold/10 text-gold-bright" : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {value ? <span className={cn("size-2 rounded-full", STATUS_META[value].dot)} aria-hidden /> : null}
              {label}
              {badge ? (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-xs font-bold text-canvas">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-full border border-line p-1" role="group" aria-label="Periode">
          {SCOPES.map(([value, label]) => (
            <Link
              key={value}
              href={href({ periode: value, pagina: undefined })}
              aria-current={scope === value ? "true" : undefined}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                scope === value ? "bg-surface-3 text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <form action="/admin/afspraken" className="relative w-full sm:w-80" role="search">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          {scope !== "upcoming" ? <input type="hidden" name="periode" value={scope} /> : null}
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            name="q"
            defaultValue={q}
            placeholder="Zoek op naam, telefoon of e-mail"
            aria-label="Zoeken"
            className="h-10 w-full rounded-full border border-line-strong bg-surface-2 pr-4 pl-10 text-sm text-ink placeholder:text-ink-faint focus:border-gold/70 focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-6">
        {result.items.length === 0 ? (
          <EmptyState icon={<CalendarX className="size-8" />} title="Geen afspraken gevonden">
            {q ? "Probeer een andere zoekterm." : "Er zijn geen afspraken die aan dit filter voldoen."}
          </EmptyState>
        ) : (
          <>
            {/* Desktop: table */}
            <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs tracking-wider text-ink-faint uppercase">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Moment</th>
                    <th className="px-5 py-3 font-semibold">Klant</th>
                    <th className="px-5 py-3 font-semibold">Behandeling</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {result.items.map((a) => (
                    <tr key={a.id} className="hover:bg-surface-2/60">
                      <td className="px-5 py-4 align-top">
                        <Link href={`/admin/afspraken/${a.id}`} className="block">
                          <span className="block font-medium text-ink">{capitalize(formatDateShort(a.date))}</span>
                          <span className="text-ink-muted tabular-nums">
                            {a.startTime.slice(0, 5)} – {a.endTime.slice(0, 5)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <Link href={`/admin/afspraken/${a.id}`} className="flex flex-wrap items-center gap-2 font-medium text-ink hover:text-gold-bright">
                          {a.firstName} {a.lastName}
                          {a.isDemo ? <DemoBadge /> : null}
                        </Link>
                        <span className="text-ink-muted">{a.phone}</span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span className="block text-ink">{a.serviceName}</span>
                        <span className="text-ink-muted">{a.barberName}</span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <StatusBadge status={a.status} />
                        <span className="mt-1 block text-xs text-ink-faint">{formatDateTime(a.createdAt)}</span>
                      </td>
                      <td className="px-5 py-4 text-right align-top">
                        {a.status === "PENDING" ? (
                          <div className="flex justify-end">
                            <StatusActions id={a.id} status={a.status} hasEmail={Boolean(a.email)} variant="quick" />
                          </div>
                        ) : (
                          <Link href={`/admin/afspraken/${a.id}`} className="text-sm font-medium text-gold hover:text-gold-bright">
                            Bekijken
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <ul className="space-y-3 lg:hidden">
              {result.items.map((a) => (
                <li key={a.id} className="rounded-2xl border border-line bg-surface p-4">
                  <Link href={`/admin/afspraken/${a.id}`} className="block">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                        {a.firstName} {a.lastName}
                        {a.isDemo ? <DemoBadge /> : null}
                      </p>
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">
                      {a.serviceName} · {a.barberName}
                    </p>
                    <p className="mt-2 text-sm text-ink">
                      {capitalize(formatDateShort(a.date))} ·{" "}
                      <span className="font-semibold tabular-nums">
                        {a.startTime.slice(0, 5)} – {a.endTime.slice(0, 5)}
                      </span>
                    </p>
                  </Link>
                  {a.status === "PENDING" ? (
                    <div className="mt-4 border-t border-line pt-4">
                      <StatusActions id={a.id} status={a.status} hasEmail={Boolean(a.email)} variant="quick" />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {result.pageCount > 1 ? (
        <nav aria-label="Paginering" className="mt-6 flex items-center justify-between text-sm text-ink-muted">
          <span>
            Pagina {result.page} van {result.pageCount} · {result.total} afspraken
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link href={href({ pagina: result.page - 1 })} className="grid size-10 place-items-center rounded-full border border-line hover:border-gold/50" aria-label="Vorige pagina">
                <ChevronLeft className="size-4" />
              </Link>
            ) : null}
            {result.page < result.pageCount ? (
              <Link href={href({ pagina: result.page + 1 })} className="grid size-10 place-items-center rounded-full border border-line hover:border-gold/50" aria-label="Volgende pagina">
                <ChevronRight className="size-4" />
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
