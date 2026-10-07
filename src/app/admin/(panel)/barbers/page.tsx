import { BarberForm } from "@/components/admin/barber-form";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { weekdayShort } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { listBarbers } from "@/server/services/catalog";

export const metadata = { title: "Barbers" };

export default async function BarbersPage() {
  await requireAdmin();
  const barbers = await listBarbers();
  return (
    <div>
      <PageHeader
        title="Barbers"
        description="Wie er werkt en wanneer. Klanten kunnen een barber kiezen als er meerdere actief zijn."
      />
      <div className="space-y-4">
        {barbers.map((barber) => (
          <details key={barber.id} className="group rounded-2xl border border-line bg-surface open:border-line-strong">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-3">
                <span className="font-semibold text-ink">{barber.name}</span>
                {!barber.isActive ? <Badge className="bg-zinc-400/10 text-zinc-300 ring-zinc-400/30">Inactief</Badge> : null}
              </span>
              <span className="flex items-center gap-4 text-sm text-ink-muted">
                <span>
                  {barber.hours
                    .filter((h) => h.isWorking)
                    .map((h) => weekdayShort(h.weekday))
                    .join(", ") || "Geen werkdagen"}
                </span>
                <span className="text-gold group-open:hidden">Bewerken</span>
              </span>
            </summary>
            <div className="border-t border-line p-5">
              <BarberForm barber={barber} />
            </div>
          </details>
        ))}
      </div>
      <section className="mt-10 rounded-2xl border border-dashed border-line-strong p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold text-ink">Nieuwe barber toevoegen</h2>
        <BarberForm />
      </section>
    </div>
  );
}
