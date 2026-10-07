import Link from "next/link";
import { cn } from "@/lib/cn";

/** Monogram: a fine gold ring with a vertical rule, evoking a barber's razor. */
export function Emblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.45" />
      <path d="M20 8.5v23" stroke="currentColor" strokeWidth="1" />
      <path d="M14.5 15.5l11 9M25.5 15.5l-11 9" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
    </svg>
  );
}

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-3", className)} aria-label="RKM Barbershop — home">
      <Emblem className="text-gold transition-transform duration-500 group-hover:rotate-90" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.55rem] font-semibold tracking-[0.12em] text-ink">RKM</span>
        <span className="mt-0.5 text-[0.58rem] font-semibold tracking-[0.42em] text-gold">BARBERSHOP</span>
      </span>
    </Link>
  );
}
