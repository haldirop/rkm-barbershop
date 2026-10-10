"use client";

import { Printer, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Print and close buttons (not printed); opens the print dialog straight away when asked. */
export function PrintControls({ autoPrint }: { autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint) return;
    // Give the fonts a moment, so the receipt is laid out before printing.
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="flex justify-center gap-2 print:hidden">
      <Button onClick={() => window.print()}>
        <Printer className="size-4" aria-hidden /> Printen
      </Button>
      <Button variant="secondary" onClick={() => window.close()}>
        <X className="size-4" aria-hidden /> Sluiten
      </Button>
    </div>
  );
}
