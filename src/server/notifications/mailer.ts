import "server-only";
import { emailConfig, type EmailConfig } from "@/server/config";
import { getDb } from "@/server/db/client";
import { emailLog } from "@/server/db/schema";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** Why a message could not be sent, in plain Dutch (shown in the admin). */
export class MailError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "MailError";
  }
}

export interface MailProvider {
  /** True when messages actually leave the building ("SENT"), false when they are only logged. */
  readonly delivers: boolean;
  send(message: MailMessage): Promise<void>;
}

const RESEND_URL = "https://api.resend.com/emails";

function explainResendError(status: number, body: { name?: string; message?: string }): MailError {
  const message = body.message ?? "";
  if (status === 401 || body.name === "missing_api_key" || body.name === "restricted_api_key") {
    return new MailError("De Resend API-sleutel (RESEND_API_KEY) is ongeldig of heeft geen verzendrechten.");
  }
  if (/only send testing emails/i.test(message)) {
    return new MailError(
      "Resend staat nog in testmodus: zolang je domein niet is geverifieerd, kun je alleen naar je eigen e-mailadres sturen.",
    );
  }
  if (/domain is not verified/i.test(message)) {
    // Name the domain, so a typo or placeholder in EMAIL_FROM is easy to spot.
    const domain = /The (\S+) domain is not verified/i.exec(message)?.[1];
    return new MailError(
      `Het afzenderdomein ${domain ? `"${domain}" ` : ""}in EMAIL_FROM is nog niet geverifieerd in Resend.`,
    );
  }
  if (body.name === "daily_quota_exceeded" || body.name === "monthly_quota_exceeded") {
    return new MailError("Het verzendlimiet van je Resend-abonnement is bereikt.");
  }
  if (status === 429 || status >= 500) {
    return new MailError("Resend is tijdelijk niet beschikbaar.", true);
  }
  return new MailError(`Resend weigerde de e-mail: ${message || `status ${status}`}`);
}

export class ResendMailProvider implements MailProvider {
  readonly delivers = true;

  constructor(
    private readonly config: EmailConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: MailMessage) {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.attempt(message);
        return;
      } catch (error) {
        const retryable = error instanceof MailError ? error.retryable : true;
        if (!retryable || attempt >= 2) {
          throw error instanceof MailError ? error : new MailError("Resend is niet bereikbaar.", true);
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }
  }

  private async attempt(message: MailMessage) {
    const response = await this.fetchImpl(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return;
    const body = (await response.json().catch(() => ({}))) as { name?: string; message?: string };
    throw explainResendError(response.status, body);
  }
}

/** Development: the e-mail is printed in the terminal instead of being sent. */
export class ConsoleMailProvider implements MailProvider {
  readonly delivers = false;
  async send(message: MailMessage) {
    console.info(`\n[e-mail] Aan: ${message.to}\n[e-mail] Onderwerp: ${message.subject}\n${message.text}\n`);
  }
}

export function isMailConfigured(): boolean {
  return emailConfig() !== null;
}

function getProvider(): MailProvider {
  const config = emailConfig();
  return config ? new ResendMailProvider(config) : new ConsoleMailProvider();
}

export interface SendResult {
  ok: boolean;
  status: "SENT" | "LOGGED" | "FAILED";
  error?: string;
}

/** Sends (or logs) an e-mail and records the outcome in `email_log`. Never throws. */
export async function sendMail(
  message: MailMessage & { template: string; appointmentId?: string | null },
): Promise<SendResult> {
  const provider = getProvider();
  let result: SendResult = { ok: true, status: provider.delivers ? "SENT" : "LOGGED" };
  try {
    await provider.send(message);
  } catch (error) {
    const reason = error instanceof MailError ? error.message : "Onbekende fout bij het versturen.";
    result = { ok: false, status: "FAILED", error: reason };
    console.error(`[e-mail] Versturen mislukt (${message.template}): ${reason}`);
  }
  try {
    await getDb().insert(emailLog).values({
      appointmentId: message.appointmentId ?? null,
      template: message.template,
      recipient: message.to,
      subject: message.subject,
      status: result.status,
      error: result.error ?? null,
    });
  } catch (error) {
    console.error("[e-mail] Kon e-maillog niet opslaan:", error);
  }
  return result;
}
