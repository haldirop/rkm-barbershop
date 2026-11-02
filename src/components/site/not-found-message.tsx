import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { localizePath, type Locale } from "@/i18n/config";
import { common } from "@/i18n/messages/common";

/** "Deze pagina bestaat niet" with the way back, in the page language. */
export function NotFoundMessage({ locale }: { locale: Locale }) {
  const t = common[locale];
  return (
    <div className="text-center">
      <p className="eyebrow">{t.notFound.eyebrow}</p>
      <h1 className="heading-display mt-4 text-4xl sm:text-5xl">{t.notFound.title}</h1>
      <p className="mx-auto mt-4 max-w-md text-ink-muted">{t.notFound.text}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href={localizePath("/afspraak-maken", locale)} className={buttonClasses({ size: "lg" })}>
          {t.book}
        </Link>
        <Link href={localizePath("/", locale)} className={buttonClasses({ size: "lg", variant: "secondary" })}>
          {t.notFound.home}
        </Link>
      </div>
    </div>
  );
}
