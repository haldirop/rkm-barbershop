import type { FieldErrors } from "@/lib/validation";

/** Result shape shared by admin form actions (used with useActionState). */
export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: FieldErrors;
  /** Logging in is blocked for this many seconds (too many wrong passwords). */
  retryAfterSeconds?: number;
  /** Submitted values to show again (React resets forms after an action). */
  values?: Record<string, string>;
} | null;
