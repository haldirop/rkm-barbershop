import Image from "next/image";
import Link from "next/link";
import mark from "@/assets/rkm-mark.png";
import { cn } from "@/lib/cn";

/** Crown + "RKM" in polished gold: the logo without the "BARBERSHOP" line. Decorative; give the parent a label. */
export function LogoMark({
  className,
  sizes = "160px",
  priority = false,
}: {
  className?: string;
  /** Rendered width, so the browser downloads a matching size (see next/image `sizes`). */
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={mark}
      alt=""
      sizes={sizes}
      priority={priority}
      draggable={false}
      className={cn("h-auto select-none", className)}
    />
  );
}

/** Crossed scissors as drawn under the logo. */
export function ScissorsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("size-5", className)} aria-hidden>
      <path d="M5.2 2.5 15.6 16.4M18.8 2.5 8.4 16.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="7" cy="18.9" r="2.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="17" cy="18.9" r="2.6" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="12" cy="11.8" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** "——— ✂ ———": the ornament from the logo, also used as a section divider. */
export function Ornament({ className }: { className?: string }) {
  return (
    <span className={cn("flex w-40 items-center gap-3 text-gold", className)} aria-hidden>
      <span className="gold-line flex-1" />
      <ScissorsMark className="size-[1.4em] shrink-0" />
      <span className="gold-line flex-1" />
    </span>
  );
}

/** "B A R B E R S H O P" in satin gold, as under the crown and RKM. */
function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-gold-satin font-display font-medium whitespace-nowrap tracking-[0.62em] [margin-right:-0.62em]",
        className,
      )}
      aria-hidden
    >
      BARBERSHOP
    </span>
  );
}

/**
 * The complete logo: crown and RKM in brushed gold, BARBERSHOP underneath and a line
 * with the scissors in the middle. Meant for a plain dark background.
 */
export function BrandLockup({
  className,
  sizes,
  priority,
}: {
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    // A size container, so the lettering scales with the width of the logo.
    <span className={cn("@container flex flex-col items-center", className)}>
      <LogoMark sizes={sizes} priority={priority} className="w-full" />
      <Wordmark className="mt-[6%] text-[6.7cqi] leading-none font-semibold" />
      <span className="mt-[4.5%] flex w-[70%] items-center gap-[0.8em] text-[6cqi] text-gold" aria-hidden>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/80 via-30% to-gold" />
        <ScissorsMark className="size-[1.45em] shrink-0" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/80 via-30% to-gold" />
      </span>
    </span>
  );
}

/** Compact logo for the header and other small places. */
export function Logo({
  className,
  href = "/",
  label = "RKM Barbershop — home",
}: {
  className?: string;
  href?: string;
  label?: string;
}) {
  return (
    <Link href={href} className={cn("group flex flex-col items-center", className)} aria-label={label}>
      <LogoMark sizes="86px" priority className="w-[86px] transition-transform duration-500 group-hover:scale-[1.03]" />
      <Wordmark className="mt-1.5 text-[0.5rem] tracking-[0.5em] [margin-right:-0.5em]" />
    </Link>
  );
}
