import { describe, expect, it } from "vitest";
import { openStatus, type OpeningDay } from "@/lib/opening-hours";

// Mon 12–18, Tue–Fri 09–18, Sat 09–17, Sun closed (as on the business card).
const DAYS: OpeningDay[] = [
  { weekday: 1, isOpen: true, open: "12:00", close: "18:00" },
  ...[2, 3, 4, 5].map((weekday) => ({ weekday, isOpen: true, open: "09:00", close: "18:00" })),
  { weekday: 6, isOpen: true, open: "09:00", close: "17:00" },
  { weekday: 7, isOpen: false, open: "09:00", close: "18:00" },
];
const THURSDAY = "2026-10-08";

describe("open status (hero and contact section)", () => {
  it("uses the regular opening hours", () => {
    expect(openStatus(DAYS, { date: THURSDAY, minutes: 10 * 60 })).toEqual({ isOpen: true, label: "Nu open · tot 18:00" });
    expect(openStatus(DAYS, { date: THURSDAY, minutes: 8 * 60 }).label).toBe("Vandaag open vanaf 09:00");
    expect(openStatus(DAYS, { date: THURSDAY, minutes: 19 * 60 }).label).toBe("Gesloten · morgen weer open om 09:00");
    expect(openStatus(DAYS, { date: "2026-10-10", minutes: 18 * 60 }).label).toBe("Gesloten · maandag weer open om 12:00");
  });

  it("skips a closed period, e.g. opening on 1 November", () => {
    const closed = [{ startDate: "2026-10-07", endDate: "2026-10-31", startTime: null, endTime: null }];
    expect(openStatus(DAYS, { date: THURSDAY, minutes: 10 * 60 }, closed)).toEqual({
      isOpen: false,
      label: "Gesloten · maandag 2 november weer open om 12:00",
    });
  });

  it("takes part-day blocks into account", () => {
    const lunch = [{ startDate: THURSDAY, endDate: THURSDAY, startTime: "13:00:00", endTime: "14:00:00" }];
    expect(openStatus(DAYS, { date: THURSDAY, minutes: 10 * 60 }, lunch).label).toBe("Nu open · tot 13:00");
    expect(openStatus(DAYS, { date: THURSDAY, minutes: 13 * 60 + 30 }, lunch).label).toBe(
      "Gesloten · vandaag weer open om 14:00",
    );
    const morning = [{ startDate: "2026-10-09", endDate: "2026-10-09", startTime: "09:00:00", endTime: "11:00:00" }];
    expect(openStatus(DAYS, { date: THURSDAY, minutes: 19 * 60 }, morning).label).toBe(
      "Gesloten · morgen weer open om 11:00",
    );
  });
});
