import type { FieldErrors } from "@/lib/validation";

/** Result shape shared by admin form actions (used with useActionState). */
export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: FieldErrors;
  /** Submitted values to show again (React resets forms after an action). */
  values?: Record<string, string>;
} | null;
