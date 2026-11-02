import "server-only";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";

/** The language of a page under app/(site)/[locale]; an unknown one is a 404. */
export async function pageLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}
