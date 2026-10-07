import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { getSettings, siteUrl } from "@/server/services/settings";
import "./globals.css";

const display = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

// Every page reads live data (opening hours, availability, settings): render per request,
// so builds never need a database connection.
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "dark",
};

export async function generateMetadata(): Promise<Metadata> {
  // The title includes the city from the settings; fall back to defaults if the database is unavailable.
  const settings = await getSettings().catch(() => ({ businessName: "RKM Barbershop", city: "" }));
  const place = settings.city ? ` in ${settings.city}` : "";
  const description = `${settings.businessName}: professionele barbershop${place}. Knippen, skin fades en baardverzorging met vakmanschap. Maak eenvoudig online een afspraak.`;
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: `${settings.businessName} | Professionele Barbershop${place}`,
      template: `%s | ${settings.businessName}`,
    },
    description,
    applicationName: settings.businessName,
    keywords: [
      "barbershop",
      "barber",
      "kapper",
      "herenkapper",
      "skin fade",
      "baard trimmen",
      settings.city ? `barbershop ${settings.city}` : "",
      settings.city ? `kapper ${settings.city}` : "",
    ].filter(Boolean),
    openGraph: {
      type: "website",
      locale: "nl_NL",
      siteName: settings.businessName,
      title: `${settings.businessName} | Professionele Barbershop${place}`,
      description,
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: true, address: true, email: true },
    alternates: { canonical: "/" },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${display.variable} ${sans.variable}`} data-scroll-behavior="smooth">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
