import { getDayAvailability } from "@/server/services/availability";
import { dateParam, handled, json, resolveAvailabilityQuery } from "../query";

/** GET /api/availability/day?behandeling=…&barber=…&datum=YYYY-MM-DD */
export const GET = handled(async (params) => {
  const date = dateParam(params, "datum");
  if (!date) return json({ error: "Ongeldige datum." }, 400);
  const resolved = await resolveAvailabilityQuery(params);
  if (!resolved.ok) return json({ error: resolved.error }, resolved.status);
  return json(await getDayAvailability(date, resolved.query));
});
