import { MessageSquare, Phone } from "lucide-react";
import Link from "next/link";
import { DemoBadge } from "@/components/ui/badge";
import { capitalize, formatDateLong, formatDateTime, formatPrice, telHref } from "@/lib/format";
import type { AppointmentListItem } from "@/server/services/appointments";
import { StatusActions } from "./status-actions";

/** A pending request, laid out as: name · treatment · day · time · [GOEDKEUREN] [WEIGEREN]. */
export function RequestCard({ item }: { item: AppointmentListItem }) {
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/admin/afspraken/${item.id}`} className="group min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink group-hover:text-gold-bright">
            {item.firstName} {item.lastName}
            {item.isDemo ? <DemoBadge /> : null}
          </p>
          <p className="mt-0.5 text-ink-muted">
            {item.serviceName} · {item.barberName} · {formatPrice(item.priceCents)}
          </p>
        </Link>
        <a
          href={telHref(item.phone)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-sm text-ink-muted hover:border-gold/50 hover:text-ink"
          aria-label={`Bel ${item.firstName} op ${item.phone}`}
        >
          <Phone className="size-3.5 text-gold" aria-hidden /> Bellen
        </a>
      </div>

      <div className="mt-4">
        <p className="text-[15px] font-medium text-ink">{capitalize(formatDateLong(item.date))}</p>
        <p className="text-2xl font-semibold text-gold-bright tabular-nums">
          {item.startTime.slice(0, 5)} – {item.endTime.slice(0, 5)}
        </p>
      </div>

      {item.notes ? (
        <p className="mt-4 flex gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink-muted">
          <MessageSquare className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          {item.notes}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-faint">Aangevraagd op {formatDateTime(item.createdAt)}</p>
        <StatusActions id={item.id} status={item.status} hasEmail={Boolean(item.email)} variant="quick" />
      </div>
    </article>
  );
}
