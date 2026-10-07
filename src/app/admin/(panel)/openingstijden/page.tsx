import { deleteBlockAction, deleteBreakAction } from "@/app/admin/actions/schedule";
import { DeleteButton } from "@/components/admin/form-helpers";
import { PageHeader } from "@/components/admin/page-header";
import { BlockForm, BreakForm, HoursForm } from "@/components/admin/schedule-forms";
import { Card, CardHeader } from "@/components/ui/card";
import { capitalize, formatDateShort, weekdayName } from "@/lib/format";
import { zonedNow } from "@/lib/time";
import { requireAdmin } from "@/server/auth/session";
import { listBreaksWithBarber, listUpcomingBlocks } from "@/server/services/admin-config";
import { listBarbers, listBusinessHours } from "@/server/services/catalog";

export const metadata = { title: "Openingstijden" };

export default async function OpeningHoursPage() {
  await requireAdmin();
  const [hours, breakRows, blocks, barbers] = await Promise.all([
    listBusinessHours(),
    listBreaksWithBarber(),
    listUpcomingBlocks(),
    listBarbers({ activeOnly: true }),
  ]);
  const barberOptions = barbers.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Openingstijden"
        description="Openingstijden, vaste pauzes en eenmalige blokkades bepalen samen welke tijden klanten kunnen boeken."
      />

      <Card>
        <CardHeader title="Openingstijden van de zaak" description="Zichtbaar op de website en gebruikt voor de agenda." />
        <div className="p-5">
          <HoursForm days={hours} />
        </div>
      </Card>

      <div className="grid gap-8 xl:grid-cols-2">
        <Card>
          <CardHeader title="Vaste pauzes" description="Terugkerend, bijvoorbeeld elke dag lunch van 13:00 tot 13:30." />
          {breakRows.length ? (
            <ul className="divide-y divide-line border-b border-line">
              {breakRows.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    <span className="text-ink">
                      {capitalize(weekdayName(b.weekday))} {b.startTime.slice(0, 5)} – {b.endTime.slice(0, 5)}
                    </span>
                    <span className="text-ink-muted">
                      {" "}
                      · {b.barberName ?? "hele zaak"}
                      {b.label ? ` · ${b.label}` : ""}
                    </span>
                  </span>
                  <DeleteButton
                    compact
                    action={deleteBreakAction.bind(null, b.id)}
                    title="Pauze verwijderen?"
                    description="Dit tijdstip wordt weer boekbaar."
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-b border-line px-5 py-4 text-sm text-ink-muted">Nog geen vaste pauzes.</p>
          )}
          <div className="p-5">
            <BreakForm barbers={barberOptions} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Blokkades" description="Eenmalig gesloten: vakantie, feestdag of bijvoorbeeld vrijdag 15:00–17:00." />
          {blocks.length ? (
            <ul className="divide-y divide-line border-b border-line">
              {blocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span>
                    <span className="text-ink">
                      {capitalize(formatDateShort(b.startDate))}
                      {b.endDate !== b.startDate ? ` t/m ${formatDateShort(b.endDate)}` : ""}
                      {b.startTime && b.endTime ? `, ${b.startTime.slice(0, 5)} – ${b.endTime.slice(0, 5)}` : ", hele dag"}
                    </span>
                    <span className="text-ink-muted">
                      {" "}
                      · {b.barberName ?? "hele zaak"}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </span>
                  </span>
                  <DeleteButton
                    compact
                    action={deleteBlockAction.bind(null, b.id)}
                    title="Blokkade verwijderen?"
                    description="Deze periode wordt weer boekbaar."
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-b border-line px-5 py-4 text-sm text-ink-muted">Geen geplande blokkades.</p>
          )}
          <div className="p-5">
            <BlockForm barbers={barberOptions} today={zonedNow().date} />
          </div>
        </Card>
      </div>
    </div>
  );
}
