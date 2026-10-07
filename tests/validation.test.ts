import { describe, expect, it } from "vitest";
import { parseBlockForm } from "@/lib/validation";

describe("block form (Openingstijden → Blokkades)", () => {
  it("accepts a whole-day period without time fields (they are hidden in the form)", () => {
    const result = parseBlockForm({
      startDate: "2026-10-07",
      endDate: "2026-10-31",
      allDay: "on",
      barberId: "",
      reason: "Opening op 1 november",
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      startDate: "2026-10-07",
      endDate: "2026-10-31",
      startTime: null,
      endTime: null,
      barberId: null,
      reason: "Opening op 1 november",
    });
  });

  it("uses the start date as end date when 'tot en met' is empty", () => {
    const result = parseBlockForm({ startDate: "2026-10-09", endDate: "", allDay: "on", barberId: "", reason: "" });
    expect(result.data?.endDate).toBe("2026-10-09");
  });

  it("accepts part of a day", () => {
    const result = parseBlockForm({
      startDate: "2026-10-09",
      endDate: "",
      startTime: "15:00",
      endTime: "17:00",
      barberId: "",
      reason: "",
    });
    expect(result.data).toMatchObject({ startTime: "15:00", endTime: "17:00" });
  });

  it("requires times when 'Hele dag' is not ticked", () => {
    const result = parseBlockForm({ startDate: "2026-10-09", endDate: "", barberId: "", reason: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an end date before the start date and an end time before the start time", () => {
    expect(parseBlockForm({ startDate: "2026-10-31", endDate: "2026-10-07", allDay: "on" }).success).toBe(false);
    expect(
      parseBlockForm({ startDate: "2026-10-09", startTime: "17:00", endTime: "15:00" }).error?.issues[0].path,
    ).toEqual(["endTime"]);
  });
});
