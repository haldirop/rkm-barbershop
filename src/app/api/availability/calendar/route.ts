import { diffInDays } from "@/lib/time";
import { getCalendar } from "@/server/services/availability";
import { dateParam, handled, json, resolveAvailabilityQuery } from "../query";

/** GET /api/availability/calendar?behandeling=…&barber=…&van=YYYY-MM-DD&tot=YYYY-MM-DD */
export const GET = handled(async (params) => {
  const from = dateParam(params, "van");
  const to = dateParam(params, "tot");
  if (!from || !to || to < from || diffInDays(from, to) > 62) {
    return json({ error: "Ongeldige periode." }, 400);
  }
  const resolved = await resolveAvailabilityQuery(params);
  if (!resolved.ok) return json({ error: resolved.error }, resolved.status);
  return json(await getCalendar(from, to, resolved.query));
});
