"use client";

import { Menu, Phone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/button";
import { useLocale } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { common } from "@/i18n/messages/common";
import { cn } from "@/lib/cn";
import { telHref } from "@/lib/format";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";

const NAV = [
  { href: "/#over-ons", key: "about" },
  { href: "/behandelingen", key: "treatments" },
  { href: "/#prijzen", key: "prices" },
  { href: "/#beschikbaarheid", key: "availability" },
  { href: "/#contact", key: "contact" },
] as const;

export function SiteHeader({ phone }: { phone: string }) {
  const locale = useLocale();
  const t = common[locale];
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu after navigating to another page.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled || open
          ? "border-b border-line/80 bg-canvas/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container-page flex h-18 items-center justify-between gap-6">
        <Logo href={localizePath("/", locale)} label={t.homeLabel} />

        <nav aria-label={t.mainMenu} className="hidden items-center gap-7 lg:flex xl:gap-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={localizePath(item.href, locale)}
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              {t.nav[item.key]}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {phone ? (
            <a
              href={telHref(phone)}
              className="hidden items-center gap-2 px-3 text-sm text-ink-muted transition-colors hover:text-ink xl:flex"
            >
              <Phone className="size-4 text-gold" aria-hidden />
              {phone}
            </a>
          ) : null}
          <LanguageSwitch className="hidden lg:flex" />
          <ButtonLink href={localizePath("/afspraak-maken", locale)} size="sm" className="hidden px-5 sm:inline-flex">
            {t.book}
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-full text-ink lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.closeMenu : t.openMenu}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-menu" className="h-[calc(100dvh-4.5rem)] animate-fade-in overflow-y-auto lg:hidden">
          <nav aria-label={t.mobileMenu} className="container-page flex flex-col py-6">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={localizePath(item.href, locale)}
                onClick={() => setOpen(false)}
                className="border-b border-line py-4 font-display text-2xl text-ink"
              >
                {t.nav[item.key]}
              </Link>
            ))}
            <ButtonLink href={localizePath("/afspraak-maken", locale)} size="lg" className="mt-8 w-full">
              {t.book}
            </ButtonLink>
            {phone ? (
              <a href={telHref(phone)} className="mt-4 flex items-center justify-center gap-2 py-3 text-ink-muted">
                <Phone className="size-4 text-gold" aria-hidden /> {t.call(phone)}
              </a>
            ) : null}
            <LanguageSwitch size="lg" className="mt-4 justify-center" />
          </nav>
        </div>
      ) : null}
    </header>
  );
}
