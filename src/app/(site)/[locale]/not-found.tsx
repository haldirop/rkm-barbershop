import { headers } from "next/headers";
import { NotFoundMessage } from "@/components/site/not-found-message";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale } from "@/i18n/config";

/** Inside the site (with menu and footer), in the page language. */
export default async function SiteNotFound() {
  const requested = (await headers()).get(LOCALE_HEADER);
  return (
    <div className="container-page grid min-h-[70vh] place-items-center pt-32 pb-24">
      <NotFoundMessage locale={isLocale(requested) ? requested : DEFAULT_LOCALE} />
    </div>
  );
}
