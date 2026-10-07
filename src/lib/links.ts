/** Deep link into the booking flow with optional pre-selections. */
export function bookingHref(params: {
  serviceId?: string | null;
  barberId?: string | null;
  date?: string | null;
  time?: string | null;
} = {}): string {
  const search = new URLSearchParams();
  if (params.serviceId) search.set("behandeling", params.serviceId);
  if (params.barberId) search.set("barber", params.barberId);
  if (params.date) search.set("datum", params.date);
  if (params.time) search.set("tijd", params.time);
  const query = search.toString();
  return query ? `/afspraak-maken?${query}` : "/afspraak-maken";
}
