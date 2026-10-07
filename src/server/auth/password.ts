import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP-recommended parameters (19 MiB memory, 2 iterations).
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const PASSWORD_MIN_LENGTH = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Used when the e-mail is unknown, so a login takes the same time either way. */
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword("timing-equaliser-not-a-real-password");
  await verifyPassword(await dummyHash, password);
}

export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Gebruik minimaal ${PASSWORD_MIN_LENGTH} tekens.`;
  }
  if (password.length > 200) return "Dit wachtwoord is te lang.";
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return "Gebruik zowel letters als cijfers.";
  }
  return null;
}
