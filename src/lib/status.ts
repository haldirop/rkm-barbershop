import type { DayLevel } from "./availability";

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Statuses that occupy a time slot. */
export const ACTIVE_STATUSES = ["PENDING", "APPROVED"] as const satisfies AppointmentStatus[];

export function isActiveStatus(status: AppointmentStatus): boolean {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export const STATUS_META: Record<
  AppointmentStatus,
  { label: string; plural: string; badge: string; block: string; dot: string }
> = {
  PENDING: {
    label: "Aanvraag",
    plural: "Aanvragen",
    badge: "bg-amber-400/12 text-amber-300 ring-amber-400/30",
    block: "border-amber-400/70 bg-amber-400/15 text-amber-100",
    dot: "bg-amber-400",
  },
  APPROVED: {
    label: "Bevestigd",
    plural: "Bevestigd",
    badge: "bg-emerald-400/12 text-emerald-300 ring-emerald-400/30",
    block: "border-emerald-400/70 bg-emerald-400/15 text-emerald-100",
    dot: "bg-emerald-400",
  },
  REJECTED: {
    label: "Afgewezen",
    plural: "Afgewezen",
    badge: "bg-red-400/12 text-red-300 ring-red-400/30",
    block: "border-red-400/60 bg-red-400/10 text-red-200 line-through",
    dot: "bg-red-400",
  },
  CANCELLED: {
    label: "Geannuleerd",
    plural: "Geannuleerd",
    badge: "bg-zinc-400/12 text-zinc-300 ring-zinc-400/30",
    block: "border-zinc-500/60 bg-zinc-500/10 text-zinc-400 line-through",
    dot: "bg-zinc-400",
  },
  COMPLETED: {
    label: "Afgerond",
    plural: "Afgerond",
    badge: "bg-sky-400/12 text-sky-300 ring-sky-400/30",
    block: "border-sky-400/60 bg-sky-400/10 text-sky-100",
    dot: "bg-sky-400",
  },
};

export const DAY_LEVEL_META: Record<DayLevel, { label: string; short: string; dot: string; cell: string }> = {
  available: {
    label: "Ruim beschikbaar",
    short: "Ruim",
    dot: "bg-emerald-400",
    cell: "text-ink hover:border-emerald-400/60",
  },
  limited: {
    label: "Beperkt beschikbaar",
    short: "Beperkt",
    dot: "bg-amber-400",
    cell: "text-ink hover:border-amber-400/60",
  },
  full: {
    label: "Vol",
    short: "Vol",
    dot: "bg-red-400",
    cell: "text-ink-faint line-through decoration-red-400/50",
  },
  closed: {
    label: "Gesloten",
    short: "Gesloten",
    dot: "bg-zinc-600",
    cell: "text-ink-faint",
  },
};
