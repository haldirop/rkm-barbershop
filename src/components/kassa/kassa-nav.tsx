"use client";

import { Calculator, LayoutDashboard, LogOut, Package, Receipt, ScrollText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions/auth";
import { LogoMark } from "@/components/site/logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/kassa", label: "Afrekenen", Icon: Receipt, exact: true },
  { href: "/kassa/bonnen", label: "Bonnen & omzet", Icon: ScrollText },
  { href: "/kassa/dagafsluiting", label: "Dagafsluiting", Icon: Calculator },
  { href: "/kassa/producten", label: "Producten", Icon: Package },
];

function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <ul className={cn("flex gap-1", className)}>
      {NAV.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href} className="shrink-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                active ? "bg-gold/10 text-gold-bright" : "text-ink-muted hover:bg-surface-3 hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Top bar of the till: its own environment, apart from the admin. */
export function KassaNav({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/kassa" className="flex shrink-0 items-end gap-2.5" aria-label="RKM Kassa">
          <LogoMark sizes="60px" className="w-[60px]" />
          <span className="pb-0.5 text-[10px] font-semibold tracking-[0.3em] text-gold">KASSA</span>
        </Link>
        <nav aria-label="Kassa" className="hidden md:block">
          <NavLinks />
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 hidden text-sm text-ink-faint lg:inline">{userName}</span>
          <Link
            href="/admin"
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink"
          >
            <LayoutDashboard className="size-4" aria-hidden />
            <span className="hidden sm:inline">Beheer</span>
            <span className="sr-only sm:hidden">Naar het beheer</span>
          </Link>
          <form action={logout}>
            <input type="hidden" name="naar" value="/kassa" />
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Uitloggen</span>
              <span className="sr-only sm:hidden">Uitloggen</span>
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Kassa" className="scrollbar-none overflow-x-auto px-4 pb-2 md:hidden">
        <NavLinks />
      </nav>
    </header>
  );
}
