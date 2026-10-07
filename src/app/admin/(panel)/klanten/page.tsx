import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { DemoBadge } from "@/components/ui/badge";
import { formatDateShort } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { listCustomers } from "@/server/services/customers";

export const metadata = { title: "Klanten" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CustomersPage({ searchParams }: PageProps<"/admin/klanten">) {
  await requireAdmin();
  const params = await searchParams;
  const q = one(params.q)?.slice(0, 100) ?? "";
  const page = Math.max(1, Number(one(params.pagina)) || 1);
  const result = await listCustomers({ q, page });
  const pageHref = (p: number) => `/admin/klanten?${new URLSearchParams({ ...(q ? { q } : {}), pagina: String(p) })}`;

  return (
    <div>
      <PageHeader title="Klanten" description={`${result.total} klanten`} />
      <form action="/admin/klanten" role="search" className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          placeholder="Zoek op naam, telefoon of e-mail"
          aria-label="Klanten zoeken"
          className="h-11 w-full rounded-full border border-line-strong bg-surface-2 pr-4 pl-10 text-sm text-ink placeholder:text-ink-faint focus:border-gold/70 focus:outline-none"
        />
      </form>

      {result.items.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="Geen klanten gevonden">
          Klanten verschijnen hier automatisch zodra ze een afspraak aanvragen.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {result.items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/klanten/${c.id}`}
                className="grid gap-1 px-5 py-4 hover:bg-surface-2 sm:grid-cols-[1.4fr_1.6fr_1fr_1fr] sm:items-center sm:gap-4"
              >
                <span className="flex flex-wrap items-center gap-2 font-medium text-ink">
                  {c.firstName} {c.lastName}
                  {c.isDemo ? <DemoBadge /> : null}
                </span>
                <span className="truncate text-sm text-ink-muted">
                  {c.phone}
                  {c.email ? ` · ${c.email}` : ""}
                </span>
                <span className="text-sm text-ink-muted">
                  {c.appointmentCount} {c.appointmentCount === 1 ? "afspraak" : "afspraken"}
                </span>
                <span className="text-sm text-ink-muted">
                  {c.nextVisit
                    ? `Volgende: ${formatDateShort(c.nextVisit)}`
                    : c.lastVisit
                      ? `Laatst: ${formatDateShort(c.lastVisit)}`
                      : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Paginering" className="mt-6 flex items-center justify-between text-sm text-ink-muted">
          <span>
            Pagina {result.page} van {result.pageCount}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link href={pageHref(result.page - 1)} className="grid size-10 place-items-center rounded-full border border-line" aria-label="Vorige pagina">
                <ChevronLeft className="size-4" />
              </Link>
            ) : null}
            {result.page < result.pageCount ? (
              <Link href={pageHref(result.page + 1)} className="grid size-10 place-items-center rounded-full border border-line" aria-label="Volgende pagina">
                <ChevronRight className="size-4" />
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
