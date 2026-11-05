/**
 * Who an appointment is for, for the shop: the customer, or someone they booked for
 * ("Daan (via Jan Jansen)"), or an unnamed person in a group booking ("Gast van Jan Jansen").
 * guestName: null = the customer themself, "" = someone without a name.
 */
export function appointmentName(a: { guestName?: string | null; firstName: string; lastName: string }): string {
  const customer = `${a.firstName} ${a.lastName}`;
  if (a.guestName === null || a.guestName === undefined) return customer;
  return a.guestName ? `${a.guestName} (via ${customer})` : `Gast van ${customer}`;
}
