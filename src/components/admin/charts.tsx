"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatAmount } from "@/lib/format";

/**
 * Small, dependency-free charts for the admin (dark surface). Every mark shows its
 * value on hover and keyboard focus, and every chart has a table view.
 */

export type ChartUnit = "euro" | "count";

const compactEuro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  // Explicit, or Node renders "€ 0,0" where the browser renders "€ 0" (hydration mismatch).
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});
const count = new Intl.NumberFormat("nl-NL");

function formatValue(value: number, unit: ChartUnit) {
  return unit === "euro" ? formatAmount(value) : count.format(value);
}

function formatTick(value: number, unit: ChartUnit) {
  return unit === "euro" ? compactEuro.format(value / 100) : count.format(value);
}

/** Round axis ticks (0 and three steps) that cover `max`. */
function niceTicks(max: number, unit: ChartUnit): number[] {
  const scale = unit === "euro" ? 100 : 1;
  const raw = Math.max(max / scale, 1) / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude;
  return [0, 1, 2, 3].map((i) => Math.round(i * step * scale));
}

function Tooltip({ children }: { children: ReactNode }) {
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-48 -translate-x-1/2 rounded-lg border border-line-strong bg-surface-3 px-3 py-2 text-xs shadow-xl"
    >
      {children}
    </div>
  );
}

function TableView({ caption, head, rows }: { caption: string; head: string[]; rows: Array<Array<string | number>> }) {
  return (
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-xs text-ink-faint hover:text-ink-muted">Bekijk als tabel</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-ink-faint">
            <tr>
              {head.map((h, i) => (
                <th key={h} className={cn("py-1.5 font-medium", i > 0 && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-t border-line">
                {row.map((cell, i) => (
                  <td key={i} className={cn("py-1.5 text-ink", i > 0 && "text-right")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Value axis with hairline gridlines; children are the columns. */
function Plot({ ticks, unit, children }: { ticks: number[]; unit: ChartUnit; children: ReactNode }) {
  const top = ticks[ticks.length - 1];
  return (
    <div className="relative h-52 pl-12 sm:h-60">
      {ticks.map((t) => (
        <div
          key={t}
          className={cn("absolute right-0 left-12 border-t", t === 0 ? "border-line-strong" : "border-line")}
          style={{ bottom: `${(t / top) * 100}%` }}
        >
          <span className="absolute -left-12 w-10 -translate-y-1/2 text-right text-[11px] text-ink-faint tabular-nums">
            {formatTick(t, unit)}
          </span>
        </div>
      ))}
      <div className="absolute inset-y-0 right-0 left-12 flex items-end">{children}</div>
    </div>
  );
}

function XLabels({ labels }: { labels: string[] }) {
  return (
    <div className="mt-2 ml-12 flex">
      {labels.map((label, i) => (
        <span
          key={`${label}-${i}`}
          // Many periods on a phone: every other label, counted back from the last one.
          className={cn(
            "flex-1 truncate text-center text-[11px] text-ink-faint",
            labels.length > 8 && (labels.length - 1 - i) % 2 === 1 && "invisible sm:visible",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export interface BarDatum {
  key: string;
  /** Short axis label, e.g. "okt" or "w41". */
  label: string;
  /** Full label for the tooltip and table, e.g. "oktober 2026". */
  title: string;
  value: number;
  note?: string;
}

/** One series of columns, e.g. revenue per week. */
export function BarChart({ data, unit, caption }: { data: BarDatum[]; unit: ChartUnit; caption: string }) {
  const [active, setActive] = useState<number | null>(null);
  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)), unit);
  const top = ticks[ticks.length - 1];

  return (
    <figure aria-label={caption}>
      <Plot ticks={ticks} unit={unit}>
        {data.map((d, i) => (
          <div
            key={d.key}
            tabIndex={0}
            aria-label={`${d.title}: ${formatValue(d.value, unit)}`}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="relative flex h-full flex-1 items-end justify-center outline-none focus-visible:bg-surface-3/60"
          >
            <div
              className={cn(
                "w-3/5 max-w-6 rounded-t-[4px] bg-chart-1 transition-[filter]",
                active === i && "brightness-125",
              )}
              style={{ height: d.value > 0 ? `max(2px, ${(d.value / top) * 100}%)` : 0 }}
            />
            {active === i ? (
              <Tooltip>
                <p className="text-sm font-semibold text-ink tabular-nums">{formatValue(d.value, unit)}</p>
                <p className="text-ink-muted">{d.title}</p>
                {d.note ? <p className="text-ink-faint">{d.note}</p> : null}
              </Tooltip>
            ) : null}
          </div>
        ))}
      </Plot>
      <XLabels labels={data.map((d) => d.label)} />
      <TableView
        caption={caption}
        head={["Periode", unit === "euro" ? "Omzet" : "Aantal"]}
        rows={data.map((d) => [d.title, formatValue(d.value, unit)])}
      />
    </figure>
  );
}

export interface StackedDatum {
  key: string;
  label: string;
  title: string;
  /** One value per series, bottom first. */
  values: number[];
}

const SERIES_CLASSES = ["bg-chart-1", "bg-chart-2"];

/** Two series stacked per period (part of a whole), e.g. returning and new customers. */
export function StackedBarChart({
  data,
  series,
  unit,
  caption,
}: {
  data: StackedDatum[];
  series: string[];
  unit: ChartUnit;
  caption: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const totals = data.map((d) => d.values.reduce((a, b) => a + b, 0));
  const ticks = niceTicks(Math.max(0, ...totals), unit);
  const top = ticks[ticks.length - 1];

  return (
    <figure aria-label={caption}>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
        {series.map((name, s) => (
          <li key={name} className="flex items-center gap-2">
            <span className={cn("size-2.5 rounded-[3px]", SERIES_CLASSES[s])} aria-hidden />
            {name}
          </li>
        ))}
      </ul>
      <Plot ticks={ticks} unit={unit}>
        {data.map((d, i) => (
          <div
            key={d.key}
            tabIndex={0}
            aria-label={`${d.title}: ${series.map((name, s) => `${name} ${formatValue(d.values[s], unit)}`).join(", ")}`}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="relative flex h-full flex-1 items-end justify-center outline-none focus-visible:bg-surface-3/60"
          >
            <div
              className={cn("flex w-3/5 max-w-6 flex-col-reverse gap-[2px] transition-[filter]", active === i && "brightness-125")}
              style={{ height: `${(totals[i] / top) * 100}%` }}
            >
              {d.values.map((value, s) =>
                value > 0 ? (
                  <div
                    key={s}
                    className={cn(SERIES_CLASSES[s], d.values.slice(s + 1).every((v) => v <= 0) && "rounded-t-[4px]")}
                    style={{ flexGrow: value, minHeight: 2 }}
                  />
                ) : null,
              )}
            </div>
            {active === i ? (
              <Tooltip>
                <p className="mb-1 text-ink-muted">{d.title}</p>
                {series.map((name, s) => (
                  <p key={name} className="flex items-center gap-2">
                    <span className={cn("h-0.5 w-3 rounded-full", SERIES_CLASSES[s])} aria-hidden />
                    <span className="font-semibold text-ink tabular-nums">{formatValue(d.values[s], unit)}</span>
                    <span className="text-ink-faint">{name.toLowerCase()}</span>
                  </p>
                ))}
              </Tooltip>
            ) : null}
          </div>
        ))}
      </Plot>
      <XLabels labels={data.map((d) => d.label)} />
      <TableView
        caption={caption}
        head={["Periode", ...series, "Totaal"]}
        rows={data.map((d, i) => [d.title, ...d.values.map((v) => formatValue(v, unit)), formatValue(totals[i], unit)])}
      />
    </figure>
  );
}

const WEEKDAYS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

/** Sequential gold ramp from the surface (none) to bright gold (busiest). */
function heatColor(value: number, max: number) {
  if (value <= 0 || max <= 0) return undefined;
  const share = 18 + Math.round((value / max) * 82);
  return `color-mix(in oklab, var(--color-gold-bright) ${share}%, var(--color-surface-2))`;
}

/** Customers per weekday (rows) and hour (columns). */
export function Heatmap({
  weekdays,
  hours,
  counts,
  max,
  openHours,
  caption,
}: {
  weekdays: number[];
  hours: number[];
  counts: Record<string, number>;
  max: number;
  /** First and last open hour per weekday; other hours without customers show as closed. */
  openHours: Record<number, [number, number]>;
  caption: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const value = (weekday: number, hour: number) => counts[`${weekday}-${hour}`] ?? 0;
  const closed = (weekday: number, hour: number) => {
    const range = openHours[weekday];
    return value(weekday, hour) === 0 && (!range || hour < range[0] || hour > range[1]);
  };
  const label = (weekday: number, hour: number) => {
    const n = value(weekday, hour);
    return `${WEEKDAYS[weekday - 1]} ${hour}:00–${hour + 1}:00 · ${n} ${n === 1 ? "klant" : "klanten"}`;
  };

  return (
    <figure aria-label={caption}>
      {/* No scroll container: it would clip the tooltips. The cells shrink to fit a phone. */}
      <div className="pb-1">
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `2.25rem repeat(${hours.length}, minmax(0, 1fr))` }}
        >
          <span aria-hidden />
          {hours.map((hour) => (
            <span key={hour} className="pb-1 text-center text-[11px] text-ink-faint tabular-nums">
              {hour}
            </span>
          ))}
          {weekdays.map((weekday) => (
            <div key={weekday} className="contents">
              <span className="self-center text-xs text-ink-muted">{WEEKDAYS[weekday - 1].slice(0, 2)}</span>
              {hours.map((hour) => {
                const key = `${weekday}-${hour}`;
                if (closed(weekday, hour)) {
                  return <div key={key} aria-hidden className="aspect-square rounded-[4px] border border-dashed border-line" />;
                }
                return (
                  <div
                    key={key}
                    tabIndex={0}
                    aria-label={label(weekday, hour)}
                    onPointerEnter={() => setActive(key)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(key)}
                    onBlur={() => setActive(null)}
                    className={cn(
                      "relative aspect-square rounded-[4px] bg-surface-2 outline-none",
                      active === key && "ring-2 ring-ink/70",
                    )}
                    style={{ backgroundColor: heatColor(value(weekday, hour), max) }}
                  >
                    {active === key ? (
                      <Tooltip>
                        <p className="text-sm font-semibold text-ink tabular-nums">
                          {value(weekday, hour)} {value(weekday, hour) === 1 ? "klant" : "klanten"}
                        </p>
                        <p className="text-ink-muted">
                          {WEEKDAYS[weekday - 1]} {hour}:00–{hour + 1}:00
                        </p>
                      </Tooltip>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-faint">
        <span>Rustig</span>
        <span className="size-3 rounded-[3px] bg-surface-2" aria-hidden />
        {[0.25, 0.5, 0.75, 1].map((share) => (
          <span key={share} className="size-3 rounded-[3px]" style={{ backgroundColor: heatColor(share * max || share, max || 1) }} aria-hidden />
        ))}
        <span>Druk{max ? ` (${max} per uur)` : ""}</span>
        <span className="ml-3 size-3 rounded-[3px] border border-dashed border-line-strong" aria-hidden />
        <span>Gesloten</span>
      </div>
      <TableView
        caption={caption}
        head={["Dag", ...hours.map((h) => `${h}:00`)]}
        rows={weekdays.map((w) => [WEEKDAYS[w - 1], ...hours.map((h) => (closed(w, h) ? "–" : value(w, h)))])}
      />
    </figure>
  );
}
