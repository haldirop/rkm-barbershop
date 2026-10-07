"use client";

import { CalendarClock, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { cancelAppointment, rescheduleAppointment } from "@/app/(site)/afspraak/[token]/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { capitalize, formatDateLong } from "@/lib/format";
import { DateTimePicker, type DateTimeValue } from "./date-time-picker";

export function ManageActions({
  token,
  today,
  lastDate,
}: {
  token: string;
  today: string;
  lastDate: string;
}) {
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
      const result = await cancelAppointment(token);
      if (!result.ok) return setError(result.error);
      setMode("idle");
      setNotice("Je afspraak is geannuleerd. Je ontvangt een bevestiging per e-mail.");
      router.refresh();
    });
  }

  function confirmReschedule() {
    if (!slot.date || !slot.time) return;
    setError(null);
    startTransition(async () => {
      const result = await rescheduleAppointment(token, slot.date!, slot.time!);
      if (!result.ok) {
        setError(result.error);
        if (result.slotTaken) {
          setSlot({ date: slot.date, time: null });
          setRefreshKey((k) => k + 1);
        }
        return;
      }
      setMode("idle");
      setNotice("Je nieuwe tijd is doorgegeven. We bevestigen hem zo snel mogelijk per e-mail.");
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
            <CalendarClock className="size-4" aria-hidden /> Afspraak verplaatsen
          </Button>
          <Button size="lg" variant="danger" onClick={() => setMode("cancel")}>
            <X className="size-4" aria-hidden /> Afspraak annuleren
          </Button>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-6">
          <h3 className="text-lg font-semibold text-ink">Weet je zeker dat je wilt annuleren?</h3>
          <p className="mt-1 text-sm text-ink-muted">Je tijdslot komt dan weer vrij voor andere klanten.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button variant="danger" onClick={confirmCancel} disabled={pending}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              Ja, annuleer mijn afspraak
            </Button>
            <Button variant="ghost" onClick={() => setMode("idle")} disabled={pending}>
              Nee, behouden
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "reschedule" ? (
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Kies een nieuw moment</h3>
              <p className="mt-1 text-sm text-ink-muted">
                Na het verplaatsen bevestigen we je nieuwe tijd opnieuw.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="grid size-10 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-3 hover:text-ink"
              aria-label="Verplaatsen sluiten"
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
              {slot.date && slot.time ? `${capitalize(formatDateLong(slot.date))} om ${slot.time}` : "Nog geen tijd gekozen"}
            </p>
            <Button size="lg" onClick={confirmReschedule} disabled={!slot.date || !slot.time || pending}>
              {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
              Verplaatsing bevestigen
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
