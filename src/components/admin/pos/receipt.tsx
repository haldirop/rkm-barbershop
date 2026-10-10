import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { formatAmount, formatDateTime } from "@/lib/format";
import { PAYMENT_METHODS, receiptRows } from "@/lib/pos";
import type { Settings } from "@/server/db/schema";
import type { SaleDetail } from "@/server/services/pos";

/**
 * A receipt as the customer gets it: on screen in the admin, and on paper (80 mm
 * receipt printers or A4) from /admin/bon/[id]. Always black on white.
 */
export function ReceiptView({ detail, settings, className }: { detail: SaleDetail; settings: Settings; className?: string }) {
  const { sale } = detail;
  const rows = receiptRows({ ...sale, lines: detail.lines });
  const address = [settings.street, [settings.postalCode, settings.city].filter(Boolean).join(" ")].filter(Boolean);

  return (
    <article
      className={cn("mx-auto w-full max-w-[22rem] bg-white px-6 py-7 print:max-w-[80mm] font-mono text-[13px] leading-relaxed text-black", className)}
      aria-label={`Bon ${sale.number}`}
    >
      <header className="text-center">
        <p className="text-base font-bold tracking-wide uppercase">{settings.businessName}</p>
        {address.map((line) => (
          <p key={line}>{line}</p>
        ))}
        {settings.phone ? <p>{settings.phone}</p> : null}
        {settings.kvkNumber ? <p>KvK {settings.kvkNumber}</p> : null}
        {settings.vatNumber ? <p>Btw {settings.vatNumber}</p> : null}
      </header>

      <div className="my-4 border-t border-dashed border-black/60" />
      {sale.kind === "REFUND" ? <p className="mb-2 text-center font-bold">TEGENBOEKING{detail.refundOf ? ` VAN BON ${detail.refundOf.number}` : ""}</p> : null}
      <dl className="grid grid-cols-[auto_1fr] gap-x-3">
        <dt>Bon</dt>
        <dd className="text-right">{sale.number}</dd>
        <dt>Datum</dt>
        <dd className="text-right">{formatDateTime(sale.createdAt)}</dd>
        {sale.barberName ? (
          <>
            <dt>Barber</dt>
            <dd className="text-right">{sale.barberName}</dd>
          </>
        ) : null}
      </dl>
      <div className="my-4 border-t border-dashed border-black/60" />

      <table className="w-full">
        <tbody>
          {rows.map((row, i) => (
            <Fragment key={i}>
              {row.kind === "subtotal" || row.kind === "total" ? (
                <tr aria-hidden>
                  <td colSpan={2} className="pt-1.5 pb-1">
                    <div className="border-t border-dashed border-black/60" />
                  </td>
                </tr>
              ) : null}
              <tr className={cn(row.kind === "total" && "text-base font-bold", row.kind === "vat" && "text-[12px]")}>
                <td className="py-0.5 pr-3 align-top">{row.label}</td>
                <td className="py-0.5 text-right align-top whitespace-nowrap">{formatAmount(row.cents)}</td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>

      <div className="my-4 border-t border-dashed border-black/60" />
      <p className="flex justify-between">
        <span>{sale.kind === "REFUND" ? "Terugbetaald via" : "Betaald met"}</span>
        <span>{PAYMENT_METHODS[sale.paymentMethod]}</span>
      </p>
      <p className="mt-5 text-center">{sale.kind === "REFUND" ? "Excuses voor het ongemak." : "Bedankt voor je bezoek!"}</p>
    </article>
  );
}
