import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const DEV_SECRET = "rkm-dev-only-secret-do-not-use-in-production";

function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET ontbreekt of is korter dan 32 tekens.");
  }
  return DEV_SECRET;
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sign(purpose: string, value: string): string {
  return createHmac("sha256", appSecret()).update(`${purpose}:${value}`).digest("base64url").slice(0, 32);
}

/**
 * Token for the customer's "manage my appointment" link: `<appointmentId>.<signature>`.
 * Signed with APP_SECRET, so it can be regenerated for every e-mail without storing it.
 */
export function createManageToken(appointmentId: string): string {
  return `${appointmentId}.${sign("manage", appointmentId)}`;
}

export function verifyManageToken(token: string): string | null {
  const match = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{32})$/.exec(token);
  if (!match) return null;
  const [, id, signature] = match;
  const expected = Buffer.from(sign("manage", id));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given) ? id : null;
}
