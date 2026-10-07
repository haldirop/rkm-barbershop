import { getSuggestions } from "@/server/services/availability";
import { handled, json, resolveAvailabilityQuery } from "../query";

/** GET /api/availability/suggestions?behandeling=…&barber=… — "Beste beschikbaarheid". */
export const GET = handled(async (params) => {
  const resolved = await resolveAvailabilityQuery(params);
  if (!resolved.ok) return json({ error: resolved.error }, resolved.status);
  return json(await getSuggestions({ ...resolved.query, maxDays: 3, perDay: 3 }));
});
