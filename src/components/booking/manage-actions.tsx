"use client";

import { CalendarClock, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { cancelAppointment, rescheduleAppointment } from "@/app/(site)/[locale]/afspraak/[token]/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/client";
import { booking } from "@/i18n/messages/booking";
import { capitalize, formatDateLong } from "@/lib/format";
import { DateTimePicker, type DateTimeValue } from "./date-time-picker";

export function ManageActions({
  token,
  today,
  lastDate,
  groupSize = 1,
}: {
  token: string;
  today: string;
  lastDate: string;
  /** People in the booking: moving or cancelling applies to all of them. */
  groupSize?: number;
}) {
  const locale = useLocale();
  const t = booking[locale].manage;
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reschedule" | "cancel">("idle");
  const [slot, setSlot] = useState<DateTimeValue>({ date: null, time: null });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, startTransition] = useTransition();
  const onSlotChange = useCallback((value: DateTimeValue) => setSlot(value), []);

  function confirmCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelAppointment(token, locale);
      if (!result.ok) return setError(result.error);
      setMode("idle");
      setNotice(t.cancelled);
      router.refresh();
    });
  }

  function confirmReschedule() {
    if (!slot.date || !slot.time) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleAppointment(token, slot.date!, slot.time!, locale);
      if (!result.ok) {
        setError(result.error);
        if (result.slotTaken) {
          setSlot({ date: slot.date, time: null });
          setRefreshKey((k) => k + 1);
        }
        return;
      }
      setMode("idle");
      setNotice(t.rescheduled);
      router.refresh();
    });
  }

  if (notice) return <Alert tone="success">{notice}</Alert>;

  return (
    <div className="space-y-6">
      {error ? <Alert tone="error">{error}</Alert> : null}

      {mode === "idle" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" onClick={() => setMode("reschedule")}>
            <CalendarClock className="size-4" aria-hidden /> {t.move}
          </Button>
          <Button size="lg" variant="danger" onClick={() => setMode("cancel")}>
            <X className="size-4" aria-hidden /> {t.cancel}
          </Button>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-6">
          <h3 className="text-lg font-semibold text-ink">{t.cancelSure}</h3>
          <p className="mt-1 text-sm text-ink-muted">{t.cancelText}</p>
          {groupSize > 1 ? <p className="mt-1 text-sm text-ink-muted">{t.groupNote(groupSize)}</p> : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="danger" onClick={confirmCancel} disabled={pending}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              {t.cancelYes}
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")} disabled={pending}>
              {t.cancelNo}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "reschedule" ? (
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">{t.newMoment}</h3>
              <p className="mt-1 text-sm text-ink-muted">{t.newMomentText}</p>
              {groupSize > 1 ? <p className="mt-1 text-sm text-ink-muted">{t.groupNote(groupSize)}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="grid size-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink"
              aria-label={t.closeMove}
            >
              <X className="size-5" />
            </button>
          </div>
          <DateTimePicker
            query={`afspraak=${encodeURIComponent(token)}`}
            today={today}
            lastDate={lastDate}
            value={slot}
            onChange={onSlotChange}
            refreshKey={refreshKey}
          />
          <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink-muted">
              {slot.date && slot.time ? t.at(capitalize(formatDateLong(slot.date, false, locale)), slot.time) : t.noTime}
            </p>
            <Button size="lg" onClick={confirmReschedule} disabled={!slot.date || !slot.time || pending}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              {t.confirmMove}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
