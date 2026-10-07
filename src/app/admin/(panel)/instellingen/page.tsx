import { PageHeader } from "@/components/admin/page-header";
import {
  AddUserForm,
  BusinessForm,
  DeleteUserButton,
  PasswordForm,
  RemoveDemoButton,
  RulesForm,
  TestEmailButton,
} from "@/components/admin/settings-forms";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { hasDemoData } from "@/server/db/seed";
import { isMailConfigured } from "@/server/notifications/mailer";
import { listUsers } from "@/server/services/admin-config";
import { loadSettings } from "@/server/services/settings";

export const metadata = { title: "Instellingen" };

export default async function SettingsPage() {
  const user = await requireAdmin();
  const [settings, users, demo] = await Promise.all([loadSettings(), listUsers(), hasDemoData(getDb())]);
  const mailReady = isMailConfigured();

  return (
    <div className="space-y-8">
      <PageHeader title="Instellingen" description="Bedrijfsgegevens, boekingsregels en toegang tot het beheer." />

      {!settings.detailsConfirmedAt ? (
        <Alert tone="warning" title="Controleer je bedrijfsgegevens">
          De gegevens hieronder zijn voorbeeldwaarden. Vul je echte adres, telefoonnummer en e-mailadres in en sla op —
          ze worden gebruikt op de website, in e-mails en voor Google.
        </Alert>
      ) : null}

      <Card id="bedrijf">
        <CardHeader title="Bedrijfsgegevens" description="Zichtbaar op de website, in e-mails en in de zoekresultaten van Google." />
        <div className="p-5">
          <BusinessForm settings={settings} />
        </div>
      </Card>

      <Card id="boekingsregels">
        <CardHeader title="Boekingsregels" description="Bepalen welke tijden klanten online kunnen kiezen." />
        <div className="p-5">
          <RulesForm settings={settings} />
        </div>
      </Card>

      <Card id="e-mail">
        <CardHeader
          title="E-mail"
          description="Bevestigingen, herinneringen en meldingen van nieuwe aanvragen."
          action={
            mailReady ? (
              <Badge className="bg-emerald-400/10 text-emerald-300 ring-emerald-400/30">Gekoppeld</Badge>
            ) : (
              <Badge className="bg-amber-400/10 text-amber-300 ring-amber-400/30">Nog niet gekoppeld</Badge>
            )
          }
        />
        <div className="space-y-4 p-5 text-sm text-ink-muted">
          {mailReady ? (
            <p>
              E-mails worden verstuurd via Resend. Elke verzonden (of mislukte) e-mail is terug te zien bij de
              betreffende afspraak. Stuur een testbericht naar jezelf om te controleren of alles werkt.
            </p>
          ) : (
            <p>
              E-mails worden nu alleen <strong className="text-ink">gelogd</strong>, niet verstuurd. Koppel Resend door bij
              je hosting (Vercel) <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-ink">RESEND_API_KEY</code>{" "}
              en <code className="rounded bg-surface-3 px-1.5 py-0.5 text-xs text-ink">EMAIL_FROM</code> in te vullen. Zie
              de handleiding ‘Zo zet je RKM Barbershop online’.
            </p>
          )}
          <TestEmailButton />
        </div>
      </Card>

      <Card id="wachtwoord">
        <CardHeader title="Je wachtwoord" description={`Ingelogd als ${user.email}`} />
        <div className="p-5">
          <PasswordForm />
        </div>
      </Card>

      <Card id="beheerders">
        <CardHeader
          title="Beheerders"
          description="Iedereen die kan inloggen in dit beheer. Een nieuwe beheerder logt in met het tijdelijke wachtwoord dat je hier kiest en wijzigt het daarna zelf."
        />
        <ul className="divide-y divide-line border-b border-line">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <span>
                <span className="text-ink">{u.name}</span>
                <span className="text-ink-muted"> · {u.email}</span>
                {u.role === "OWNER" ? <Badge className="ml-2 bg-gold/10 text-gold ring-gold/30">Eigenaar</Badge> : null}
                <span className="block text-xs text-ink-faint">
                  {u.lastLoginAt ? `Laatst ingelogd ${formatDateTime(u.lastLoginAt)}` : "Nog niet ingelogd"}
                </span>
              </span>
              {u.id !== user.id && u.role !== "OWNER" ? <DeleteUserButton id={u.id} name={u.name} /> : null}
            </li>
          ))}
        </ul>
        <div className="p-5">
          <AddUserForm />
        </div>
      </Card>

      {demo ? (
        <Card id="demodata">
          <CardHeader title="Demodata" description="Voorbeeldklanten, -afspraken en -reviews om het systeem uit te proberen." />
          <div className="flex flex-col gap-4 p-5 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
            <p>Demodata is herkenbaar aan het label ‘Demo’. Verwijder het voordat je live gaat.</p>
            <RemoveDemoButton />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
