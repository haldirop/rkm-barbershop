import type { Locale } from "./config";
import { booking, type BookingMessages } from "./messages/booking";

/** A message for a customer, by key, with an optional number (hours, count). */
export interface CustomerMessage {
  key: keyof BookingMessages["errors"];
  arg?: number;
}

export function translateCustomerMessage(message: CustomerMessage, locale: Locale): string {
  const entry = booking[locale].errors[message.key];
  return typeof entry === "function" ? entry(message.arg ?? 0) : entry;
}

/**
 * The text of a DomainError for a customer, in their language. Errors without a
 * translation key fall back to their (Dutch) message; "slot taken" always has one.
 */
export function customerErrorText(
  error: { message: string; code: string; customer?: CustomerMessage },
  locale: Locale,
): string {
  const message = error.customer ?? (error.code === "SLOT_TAKEN" ? { key: "slotTaken" as const } : null);
  return message ? translateCustomerMessage(message, locale) : error.message;
}
