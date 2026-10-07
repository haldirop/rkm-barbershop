"use client";

import { CalendarDays, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { telHref } from "@/lib/format";

/** Sticky call-to-action on phones. Hidden where the booking flow itself is shown. */
export function MobileBookingBar({ phone }: { phone: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/afspraak")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
      <div className="flex gap-3">
        {phone ? (
          <a
            href={telHref(phone)}
            aria-label={`Bel ${phone}`}
            className="grid size-13 shrink-0 place-items-center rounded-full border border-line-strong text-ink"
          >
            <Phone className="size-5 text-gold" aria-hidden />
          </a>
        ) : null}
        <Link
          href="/afspraak-maken"
          className="flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-gold-metal text-base font-semibold text-canvas active:scale-[0.98]"
        >
          <CalendarDays className="size-5" aria-hidden />
          Afspraak maken
        </Link>
      </div>
    </div>
  );
}
