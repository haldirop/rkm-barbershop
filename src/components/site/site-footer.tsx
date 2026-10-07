import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { capitalize, telHref, weekdayShort } from "@/lib/format";
import { groupOpeningDays } from "@/lib/opening-hours";
import type { SiteData } from "@/server/services/site";
import { formatAddress, mapsUrl } from "@/server/services/settings";
import { BrandLockup } from "./logo";
import { FacebookIcon, InstagramIcon } from "./social-icons";

export function SiteFooter({ site }: { site: SiteData }) {
  const { settings } = site;
  const groups = groupOpeningDays(site.openingDays);
  return (
    <footer className="border-t border-line bg-surface pb-28 lg:pb-0">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-5">
          <Link href="/" aria-label="RKM Barbershop — home" className="block w-52">
            <BrandLockup sizes="13rem" />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-ink-muted">
            Vakmanschap in knippen, fades en baardverzorging. Maak eenvoudig online een afspraak.
          </p>
          <div className="flex gap-2">
            {settings.instagramUrl ? (
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid size-10 place-items-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-gold hover:text-gold"
              >
                <InstagramIcon className="size-4" />
              </a>
            ) : null}
            {settings.facebookUrl ? (
              <a
                href={settings.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="grid size-10 place-items-center rounded-full border border-line-strong text-ink-muted transition-colors hover:border-gold hover:text-gold"
              >
                <FacebookIcon className="size-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div>
          <h2 className="eyebrow mb-5">Navigatie</h2>
          <ul className="space-y-3 text-sm">
            {[
              ["/afspraak-maken", "Afspraak maken"],
              ["/behandelingen", "Behandelingen & prijzen"],
              ["/#over-ons", "Over ons"],
              ["/#contact", "Contact & route"],
              ["/privacy", "Privacyverklaring"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-ink-muted transition-colors hover:text-ink">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow mb-5">Contact</h2>
          <address className="space-y-3 text-sm not-italic">
            {formatAddress(settings) ? (
              <a
                href={mapsUrl(settings)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 text-ink-muted transition-colors hover:text-ink"
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <span>
                  {settings.street}
                  <br />
                  {settings.postalCode} {settings.city}
                </span>
              </a>
            ) : null}
            {settings.phone ? (
              <a href={telHref(settings.phone)} className="flex gap-3 text-ink-muted transition-colors hover:text-ink">
                <Phone className="size-4 shrink-0 text-gold" aria-hidden />
                {settings.phone}
              </a>
            ) : null}
            {settings.email ? (
              <a href={`mailto:${settings.email}`} className="flex gap-3 text-ink-muted transition-colors hover:text-ink">
                <Mail className="size-4 shrink-0 text-gold" aria-hidden />
                {settings.email}
              </a>
            ) : null}
          </address>
        </div>

        <div>
          <h2 className="eyebrow mb-5">Openingstijden</h2>
          <ul className="space-y-2 text-sm">
            {groups.map((g) => (
              <li key={g.from} className="flex justify-between gap-4 text-ink-muted">
                <span>
                  {capitalize(weekdayShort(g.from))}
                  {g.to !== g.from ? ` – ${weekdayShort(g.to)}` : ""}
                </span>
                <span className="tabular-nums">{g.isOpen ? `${g.open} – ${g.close}` : "Gesloten"}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-faint sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.businessName}
            {settings.kvkNumber ? ` · KvK ${settings.kvkNumber}` : ""}
          </p>
          <p>Strak geknipt. Zelfverzekerd naar buiten.</p>
        </div>
      </div>
    </footer>
  );
}
