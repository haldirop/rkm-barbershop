import { Languages } from "lucide-react";
import type { ReactNode } from "react";

/**
 * English and German versions of a text, for the website in those languages. Folded away
 * by default; empty fields show the Dutch text on the English or German site.
 */
export function TranslationFields({ filled, children }: { filled: boolean; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-line open:border-line-strong">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <Languages className="size-4 text-gold" aria-hidden />
        <span className="font-medium text-ink">Engels en Duits</span>
        <span className="text-ink-faint">
          {filled ? "voor de website in die talen" : "nog leeg: daar staat dan de Nederlandse tekst"}
        </span>
        <span className="ml-auto text-gold group-open:hidden">Bewerken</span>
      </summary>
      <div className="grid gap-4 border-t border-line p-4 sm:grid-cols-2">{children}</div>
    </details>
  );
}
