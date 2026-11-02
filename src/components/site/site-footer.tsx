import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { localizePath } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { capitalize, telHref, weekdayShort } from "@/lib/format";
import { groupOpeningDays } from "@/lib/opening-hours";
import type { SiteData } from "@/server/services/site";
import { formatAddress, mapsUrl } from "@/server/services/settings";
import { BrandLockup } from "./logo";
import { FacebookIcon, InstagramIcon } from "./social-icons";

export function SiteFooter({ site }: { site: SiteData }) {
  const { settings, locale } = site;
  const t = common[locale];
  const groups = groupOpeningDays(site.openingDays);
  return (
    <footer className="border-t border-line bg-surface pb-28 lg:pb-0">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-5">
          <Link href={localizePath("/", locale)} aria-label={t.homeLabel} className="block w-52">
            <BrandLockup sizes="13rem" />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-ink-muted">{t.footer.intro}</p>
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
          <h2 className="eyebrow mb-5">{t.footer.navigation}</h2>
          <ul className="space-y-3 text-sm">
            {[
              ["/afspraak-maken", t.footer.book],
              ["/behandelingen", t.footer.treatments],
              ["/#over-ons", t.footer.about],
              ["/#contact", t.footer.contact],
              ["/privacy", t.footer.privacy],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={localizePath(href, locale)} className="text-ink-muted transition-colors hover:text-ink">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="eyebrow mb-5">{t.footer.contactHeading}</h2>
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
          <h2 className="eyebrow mb-5">{t.footer.hours}</h2>
          <ul className="space-y-2 text-sm">
            {groups.map((g) => (
              <li key={g.from} className="flex justify-between gap-4 text-ink-muted">
                <span>
                  {capitalize(weekdayShort(g.from, locale))}
                  {g.to !== g.from ? ` – ${weekdayShort(g.to, locale)}` : ""}
                </span>
                <span className="tabular-nums">{g.isOpen ? `${g.open} – ${g.close}` : t.closed}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-faint sm:flex-row sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.businessName}
            {settings.kvkNumber ? ` · ${t.footer.kvk} ${settings.kvkNumber}` : ""}
          </p>
          <p>{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
