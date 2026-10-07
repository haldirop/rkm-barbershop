import { describe, expect, it } from "vitest";
import {
  barberStarts,
  bestWindow,
  daySlots,
  pickBarber,
  recommendStarts,
  summarizeDay,
  type DayInput,
  type SlotRules,
} from "@/lib/availability";
import { timeToMinutes as t, minutesToTime } from "@/lib/time";

const A = "barber-a";
const B = "barber-b";

function day(overrides: Partial<DayInput> = {}): DayInput {
  return {
    shopHours: { start: t("09:00"), end: t("18:00") },
    barbers: [{ id: A, hours: { start: t("09:00"), end: t("18:00") } }],
    breaks: [],
    blocks: [],
    appointments: [],
    ...overrides,
  };
}

const rules = (overrides: Partial<SlotRules> = {}): SlotRules => ({
  durationMinutes: 30,
  slotIntervalMinutes: 15,
  bufferMinutes: 0,
  earliestStart: 0,
  ...overrides,
});

const times = (starts: number[]) => starts.map(minutesToTime);

describe("barberStarts", () => {
  it("never offers a start whose full duration overlaps an appointment", () => {
    const d = day({
      appointments: [{ id: "x", barberId: A, start: t("12:00"), end: t("12:45") }],
    });
    const starts = times(barberStarts(d, d.barbers[0], rules()));
    expect(starts).not.toContain("11:45");
    expect(starts).not.toContain("12:00");
    expect(starts).not.toContain("12:15");
    expect(starts).not.toContain("12:30");
    expect(starts).toContain("11:30");
    expect(starts).toContain("12:45");
  });

  it("only offers starts where the service ends before closing time", () => {
    const d = day();
    const starts = times(barberStarts(d, d.barbers[0], rules({ durationMinutes: 45 })));
    expect(starts.at(-1)).toBe("17:15");
    expect(starts[0]).toBe("09:00");
  });

  it("respects breaks, blocks and barber working hours", () => {
    const d = day({
      barbers: [{ id: A, hours: { start: t("10:00"), end: t("16:00") } }],
      breaks: [{ barberId: null, start: t("13:00"), end: t("13:30") }],
      blocks: [{ barberId: A, start: t("15:00"), end: t("17:00") }],
    });
    const starts = times(barberStarts(d, d.barbers[0], rules()));
    expect(starts[0]).toBe("10:00");
    expect(starts).not.toContain("12:45");
    expect(starts).not.toContain("13:00");
    expect(starts).toContain("13:30");
    expect(starts.at(-1)).toBe("14:30");
  });

  it("applies buffer time on both sides of existing appointments", () => {
    const d = day({
      appointments: [{ id: "x", barberId: A, start: t("12:00"), end: t("12:30") }],
    });
    const starts = times(barberStarts(d, d.barbers[0], rules({ bufferMinutes: 10 })));
    expect(starts).not.toContain("11:30"); // would end 12:00, needs 10 min gap
    expect(starts).toContain("11:15");
    expect(starts).toContain("12:40"); // right after appointment + buffer
    expect(starts).not.toContain("12:30");
  });

  it("does not offer times before the earliest allowed start (lead time)", () => {
    const d = day();
    const starts = barberStarts(d, d.barbers[0], rules({ earliestStart: t("14:10") }));
    expect(minutesToTime(starts[0])).toBe("14:15");
  });

  it("ignores the appointment that is being rescheduled", () => {
    const d = day({
      appointments: [{ id: "self", barberId: A, start: t("10:00"), end: t("10:30") }],
    });
    const starts = times(barberStarts(d, d.barbers[0], rules({ excludeAppointmentId: "self" })));
    expect(starts).toContain("10:00");
  });
});

describe("daySlots with multiple barbers", () => {
  it("merges availability and lists which barbers can take a slot", () => {
    const d = day({
      barbers: [
        { id: A, hours: { start: t("09:00"), end: t("18:00") } },
        { id: B, hours: { start: t("09:00"), end: t("18:00") } },
      ],
      appointments: [{ id: "x", barberId: A, start: t("10:00"), end: t("11:00") }],
    });
    const slot = daySlots(d, rules()).find((s) => s.start === t("10:00"));
    expect(slot?.barberIds).toEqual([B]);
    expect(daySlots(d, rules(), [A]).some((s) => s.start === t("10:00"))).toBe(false);
  });

  it("assigns the least busy barber", () => {
    const d = day({
      barbers: [
        { id: A, hours: { start: t("09:00"), end: t("18:00") } },
        { id: B, hours: { start: t("09:00"), end: t("18:00") } },
      ],
      appointments: [{ id: "x", barberId: A, start: t("10:00"), end: t("11:00") }],
    });
    expect(pickBarber(d, [A, B])).toBe(B);
  });
});

describe("summarizeDay", () => {
  it("is closed when the shop is closed or fully blocked", () => {
    expect(summarizeDay(day({ shopHours: null }), rules()).level).toBe("closed");
    expect(
      summarizeDay(day({ blocks: [{ barberId: null, start: 0, end: 1440 }] }), rules()).level,
    ).toBe("closed");
  });

  it("is full when nothing fits anymore", () => {
    const d = day({
      shopHours: { start: t("09:00"), end: t("10:00") },
      appointments: [{ id: "x", barberId: A, start: t("09:00"), end: t("09:45") }],
    });
    expect(summarizeDay(d, rules()).level).toBe("full");
  });

  it("is limited when only a small part of the day is free", () => {
    const d = day({
      appointments: [{ id: "x", barberId: A, start: t("09:00"), end: t("17:00") }],
    });
    const summary = summarizeDay(d, rules());
    expect(summary.level).toBe("limited");
    expect(minutesToTime(summary.firstStart!)).toBe("17:00");
  });

  it("is available on a quiet day", () => {
    expect(summarizeDay(day(), rules()).level).toBe("available");
  });
});

describe("best availability", () => {
  // The example from the brief: 10:00 and 10:30 booked, 11:00–12:00 free, 12:00 booked.
  const d = day({
    shopHours: { start: t("10:00"), end: t("13:00") },
    appointments: [
      { id: "1", barberId: A, start: t("10:00"), end: t("11:00") },
      { id: "2", barberId: A, start: t("12:00"), end: t("13:00") },
    ],
  });

  it("finds the free period 11:00 – 12:00", () => {
    const window = bestWindow(daySlots(d, rules()), rules());
    expect(window && [minutesToTime(window.start), minutesToTime(window.end)]).toEqual([
      "11:00",
      "12:00",
    ]);
  });

  it("recommends 11:00 and 11:30", () => {
    expect(times(recommendStarts(daySlots(d, rules()), rules()))).toEqual(["11:00", "11:30"]);
  });

  it("prefers the largest free period", () => {
    const busy = day({
      appointments: [
        { id: "1", barberId: A, start: t("09:30"), end: t("12:00") },
        { id: "2", barberId: A, start: t("12:30"), end: t("15:00") },
      ],
    });
    // Free: 09:00–09:30 (small), 12:00–12:30 (small), 15:00–18:00 (large)
    expect(times(recommendStarts(daySlots(busy, rules()), rules()))).toEqual([
      "15:00",
      "15:30",
      "16:00",
    ]);
  });
});

describe("summarizeDay later in the day", () => {
  it("is closed (not full) when the remaining opening hours have passed", () => {
    expect(summarizeDay(day(), rules({ earliestStart: t("18:30") })).level).toBe("closed");
  });
});
