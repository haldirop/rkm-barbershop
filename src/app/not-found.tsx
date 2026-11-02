import { headers } from "next/headers";
import { BrandLockup } from "@/components/site/logo";
import { NotFoundMessage } from "@/components/site/not-found-message";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale } from "@/i18n/config";

export default async function NotFound() {
  const requested = (await headers()).get(LOCALE_HEADER);
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div>
        <BrandLockup sizes="14rem" className="mx-auto mb-8 w-56" />
        <NotFoundMessage locale={isLocale(requested) ? requested : DEFAULT_LOCALE} />
      </div>
    </main>
  );
}
