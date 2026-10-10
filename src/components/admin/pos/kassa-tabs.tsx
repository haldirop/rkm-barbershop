import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "afrekenen", href: "/admin/kassa", label: "Afrekenen" },
  { key: "bonnen", href: "/admin/kassa/bonnen", label: "Bonnen & omzet" },
  { key: "dagafsluiting", href: "/admin/kassa/dagafsluiting", label: "Dagafsluiting" },
] as const;

export function KassaTabs({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Kassa" className="scrollbar-none -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
            tab.key === active ? "border-gold text-gold-bright" : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
