import { BellRing } from "lucide-react";
import { deleteAlertAction } from "@/app/admin/actions/waitlist";
import { DeleteButton } from "@/components/admin/form-helpers";
import { EmptyState, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { capitalize, formatDateLong, formatDateTime } from "@/lib/format";
import { zonedNow } from "@/lib/time";
import { requireAdmin } from "@/server/auth/session";
import { listWaitlist, type WaitlistEntry } from "@/server/services/waitlist";

export const metadata = { title: "Wachtlijst" };

export default async function WaitlistPage() {
  await requireAdmin();
  const entries = await listWaitlist(zonedNow().date);
  const byDate = new Map<string, WaitlistEntry[]>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wachtlijst"
        description="Klanten die een e-mail willen als er op een volgeboekte dag toch een plek vrijkomt. Dat gaat automatisch: zodra er plek is (een annulering, een weggehaalde blokkade of ruimere openingstijden), krijgen ze bericht."
      />
      {byDate.size === 0 ? (
        <EmptyState icon={<BellRing className="size-8" />} title="Niemand op de wachtlijst">
          Is een dag volgeboekt, dan kunnen klanten zich op de website aanmelden voor een melding.
        </EmptyState>
      ) : (
        [...byDate].map(([date, list]) => {
          const waiting = list.filter((e) => !e.notifiedAt).length;
          return (
            <Card key={date}>
              <CardHeader
                title={capitalize(formatDateLong(date))}
                description={`${waiting} wachtend${list.length > waiting ? ` · ${list.length - waiting} al bericht gehad` : ""}`}
              />
              <ul className="divide-y divide-line">
                {list.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0">
                      <a href={`mailto:${e.email}`} className="font-medium text-ink hover:text-gold-bright">
                        {e.email}
                      </a>
                      <span className="block text-ink-muted">
                        {e.serviceName} · {e.barberName ?? "geen voorkeur"} · aangemeld {formatDateTime(e.createdAt)}
                      </span>
                      {!e.notifiedAt && e.lastError ? (
                        <span className="mt-1 block text-red-300">
                          Er is plek, maar de e-mail kon niet worden verstuurd: {e.lastError} Hij wordt bij de
                          volgende controle opnieuw geprobeerd.
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-3">
                      {e.notifiedAt ? (
                        <Badge className="bg-emerald-400/10 text-emerald-300 ring-emerald-400/30">
                          Bericht verstuurd {formatDateTime(e.notifiedAt)}
                        </Badge>
                      ) : e.lastError ? (
                        <Badge className="bg-red-400/10 text-red-300 ring-red-400/30">E-mail mislukt</Badge>
                      ) : (
                        <Badge className="bg-amber-400/10 text-amber-300 ring-amber-400/30">Wacht op plek</Badge>
                      )}
                      <DeleteButton
                        compact
                        action={deleteAlertAction.bind(null, e.id)}
                        title="Aanmelding verwijderen?"
                        description="Deze klant krijgt dan geen e-mail meer als er plek vrijkomt."
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })
      )}
    </div>
  );
}
