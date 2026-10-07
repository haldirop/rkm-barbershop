"use client";

import {
  CalendarCheck,
  CalendarDays,
  Clock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Scissors,
  Settings,
  Star,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/actions/auth";
import { LogoMark } from "@/components/site/logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Overzicht", Icon: LayoutDashboard, exact: true },
  { href: "/admin/afspraken", label: "Afspraken", Icon: CalendarCheck, badge: true },
  { href: "/admin/agenda", label: "Agenda", Icon: CalendarDays },
  { href: "/admin/klanten", label: "Klanten", Icon: Users },
  { href: "/admin/diensten", label: "Diensten", Icon: Scissors },
  { href: "/admin/barbers", label: "Barbers", Icon: UserRound },
  { href: "/admin/openingstijden", label: "Openingstijden", Icon: Clock },
  { href: "/admin/reviews", label: "Reviews", Icon: Star },
  { href: "/admin/instellingen", label: "Instellingen", Icon: Settings },
];

function NavLinks({ pending, onNavigate }: { pending: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-1">
      {NAV.map(({ href, label, Icon, exact, badge }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                active ? "bg-gold/10 text-gold-bright" : "text-ink-muted hover:bg-surface-3 hover:text-ink",
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
              {badge && pending > 0 ? (
                <span className="ml-auto grid h-6 min-w-6 place-items-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-canvas">
                  {pending}
                  <span className="sr-only"> nieuwe aanvragen</span>
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ userName }: { userName: string }) {
  return (
    <div className="space-y-1 border-t border-line pt-4">
      <p className="px-3 pb-2 text-xs text-ink-faint">
        Ingelogd als <span className="text-ink-muted">{userName}</span>
      </p>
      <Link
        href="/"
        target="_blank"
        className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink"
      >
        <ExternalLink className="size-4" aria-hidden /> Website bekijken
      </Link>
      <form action={logout}>
        <button
          type="submit"
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink"
        >
          <LogOut className="size-4" aria-hidden /> Uitloggen
        </button>
      </form>
    </div>
  );
}

export function AdminSidebar({ pending, userName }: { pending: number; userName: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link href="/admin" className="flex items-end gap-3 px-3" aria-label="RKM Beheer">
        <LogoMark sizes="76px" className="w-[76px]" />
        <span className="pb-1 text-[10px] font-semibold tracking-[0.3em] text-gold">BEHEER</span>
      </Link>
      <nav aria-label="Beheer" className="mt-8 flex-1 overflow-y-auto">
        <NavLinks pending={pending} />
      </nav>
      <Footer userName={userName} />
    </aside>
  );
}

export function AdminMobileBar({ pending, userName }: { pending: number; userName: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-xl lg:hidden">
      <div className="flex h-16 items-center justify-between px-4">
        <Link href="/admin" className="flex items-end gap-2.5" aria-label="RKM Beheer">
          <LogoMark sizes="60px" className="w-[60px]" />
          <span className="pb-0.5 text-[10px] font-semibold tracking-[0.3em] text-gold">BEHEER</span>
        </Link>
        <div className="flex items-center gap-2">
          {pending > 0 ? (
            <Link
              href="/admin/afspraken?status=PENDING"
              className="flex h-9 items-center gap-1.5 rounded-full bg-amber-400 px-3 text-sm font-bold text-canvas"
            >
              {pending} nieuw
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-full text-ink"
            aria-expanded={open}
            aria-label={open ? "Menu sluiten" : "Menu openen"}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav aria-label="Beheer" className="max-h-[calc(100dvh-4rem)] animate-fade-in overflow-y-auto border-t border-line px-4 py-4">
          <NavLinks pending={pending} onNavigate={() => setOpen(false)} />
          <div className="mt-4">
            <Footer userName={userName} />
          </div>
        </nav>
      ) : null}
    </div>
  );
}
