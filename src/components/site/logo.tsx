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

/** "——— B A R B E R S H O P ———" */
function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex w-full items-center gap-[0.9em]", className)} aria-hidden>
      <span className="gold-line flex-1" />
      <span className="font-display font-semibold tracking-[0.42em] text-ink/95 [margin-right:-0.42em]">
        BARBERSHOP
      </span>
      <span className="gold-line flex-1" />
    </span>
  );
}

/** The complete logo as on the business card: crown, RKM, BARBERSHOP and scissors. */
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
      <LogoMark sizes={sizes} priority={priority} className="w-[86%]" />
      <Wordmark className="mt-[4%] text-[4.4cqi]" />
      <Ornament className="mt-[3%] w-[62%] text-[4.4cqi]" />
    </span>
  );
}

/** Compact logo for the header and other small places. */
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex flex-col items-center", className)} aria-label="RKM Barbershop — home">
      <LogoMark sizes="86px" priority className="w-[86px] transition-transform duration-500 group-hover:scale-[1.03]" />
      <span className="mt-1 font-display text-[0.5rem] font-semibold tracking-[0.42em] text-ink/85 [margin-right:-0.42em]">
        BARBERSHOP
      </span>
    </Link>
  );
}
