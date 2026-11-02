import type { Metadata } from "next";
import { home } from "@/i18n/messages/home";
import { privacy } from "@/i18n/messages/privacy";
import { alternatesFor } from "@/i18n/seo";
import { pageLocale } from "@/i18n/server";
import { formatAddress } from "@/server/services/settings";
import { getSiteData } from "@/server/services/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const locale = await pageLocale(params);
  const t = home[locale].meta;
  return {
    title: t.privacyTitle,
    description: t.privacyDescription,
    alternates: alternatesFor("/privacy", locale),
  };
}

export default async function PrivacyPage({ params }: PageProps<"/[locale]/privacy">) {
  const locale = await pageLocale(params);
  const { settings } = await getSiteData(locale);
  const t = privacy[locale];
  const sections = t.sections({
    business: settings.businessName,
    address: formatAddress(settings),
    kvk: settings.kvkNumber ?? "",
    contact: [settings.email, settings.phone].filter(Boolean).join(` ${t.or} `),
  });
  return (
    <article className="container-page max-w-3xl pt-32 pb-24 sm:pt-40">
      <p className="eyebrow flex items-center gap-3">
        <span className="gold-rule" aria-hidden />
        {t.eyebrow}
      </p>
      <h1 className="heading-display mt-4 text-5xl">{t.title}</h1>
      {t.translationNote ? (
        <p className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-muted">{t.translationNote}</p>
      ) : null}
      <div className="mt-10 space-y-8 leading-relaxed text-ink-muted [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.list ? (
              <ul>
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>{section.body}</p>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}
