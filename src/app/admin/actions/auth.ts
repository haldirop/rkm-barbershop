"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  LOGIN_LIMIT_PER_EMAIL,
  LOGIN_LIMIT_PER_NETWORK,
  LOGIN_WINDOW_MINUTES,
  latest,
  lockedState,
  withAttemptsLeft,
} from "@/server/auth/login-limit";
import { passwordProblem } from "@/server/auth/password";
import { clearHits, clientIp, hitsInWindow, isRateLimited, recordHit, unlockTime } from "@/server/auth/rate-limit";
import {
  changeOwnPassword,
  requestPasswordReset,
  requireAdmin,
  safeReturnPath,
  setNewPassword,
  signIn,
  signOut,
} from "@/server/auth/session";
import type { FormState } from "./types";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(254),
  password: z.string().min(1).max(200),
});

const UNAVAILABLE = "Inloggen lukt op dit moment niet. Probeer het over een paar minuten opnieuw.";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!parsed.success) return { error: "Onjuist e-mailadres of wachtwoord.", values: { email } };

  const emailKey = `login:email:${email}`;
  const limits = [
    { key: emailKey, limit: LOGIN_LIMIT_PER_EMAIL },
    { key: `login:ip:${await clientIp()}`, limit: LOGIN_LIMIT_PER_NETWORK },
  ];
  const lockedUntil = async () =>
    latest(
      await Promise.all(
        limits.map(async ({ key, limit }) =>
          unlockTime(await hitsInWindow(key, LOGIN_WINDOW_MINUTES), limit, LOGIN_WINDOW_MINUTES),
        ),
      ),
    );

  const until = await lockedUntil();
  if (until) return { ...lockedState(until), values: { email } };

  let result;
  try {
    result = await signIn(parsed.data.email, parsed.data.password);
  } catch (error) {
    console.error("[auth] Inloggen mislukt:", error);
    return { error: UNAVAILABLE, values: { email } };
  }
  if (!result.ok) {
    await Promise.all(limits.map(({ key }) => recordHit(key)));
    const nowLocked = await lockedUntil();
    if (nowLocked) return { ...lockedState(nowLocked), values: { email } };
    const left = LOGIN_LIMIT_PER_EMAIL - (await hitsInWindow(emailKey, LOGIN_WINDOW_MINUTES)).length;
    return { error: withAttemptsLeft(result.error, left), values: { email } };
  }
  await clearHits(emailKey);
  redirect(safeReturnPath(formData.get("naar")) ?? "/admin");
}

export async function logout(formData?: FormData) {
  try {
    await signOut();
  } catch (error) {
    console.error("[auth] Uitloggen mislukt:", error);
  }
  // From the till, the next person logs in straight back into the till.
  const back = safeReturnPath(formData?.get("naar"));
  redirect(back ? `/admin/login?naar=${encodeURIComponent(back)}` : "/admin/login");
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  const problem = passwordProblem(next);
  if (problem) return { fieldErrors: { next: problem } };
  if (next !== repeat) return { fieldErrors: { repeat: "De wachtwoorden komen niet overeen." } };

  try {
    const result = await changeOwnPassword(user, current, next);
    if (!result.ok) {
      return result.field ? { fieldErrors: { [result.field]: result.error } } : { error: result.error };
    }
  } catch (error) {
    console.error("[auth] Wachtwoord wijzigen mislukt:", error);
    return { error: UNAVAILABLE };
  }
  return { ok: true, message: "Je wachtwoord is gewijzigd. Andere apparaten zijn uitgelogd." };
}

export async function forgotPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!z.email().safeParse(email).success) return { fieldErrors: { email: "Vul een geldig e-mailadres in." } };

  const key = `reset:${await clientIp()}`;
  if (await isRateLimited(key, 5, 60)) return { error: "Te veel aanvragen. Probeer het later opnieuw." };
  await recordHit(key);

  try {
    const result = await requestPasswordReset(email);
    if (!result.ok) return { error: result.error };
  } catch (error) {
    console.error("[auth] Herstelmail aanvragen mislukt:", error);
    return { error: UNAVAILABLE };
  }
  return {
    ok: true,
    message: "Als dit e-mailadres bij een beheerder hoort, ontvang je binnen enkele minuten een e-mail met een link.",
  };
}

export async function chooseNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");
  const problem = passwordProblem(next);
  if (problem) return { fieldErrors: { next: problem } };
  if (next !== repeat) return { fieldErrors: { repeat: "De wachtwoorden komen niet overeen." } };
  try {
    const result = await setNewPassword(next);
    if (!result.ok) return { error: result.error };
  } catch (error) {
    console.error("[auth] Nieuw wachtwoord instellen mislukt:", error);
    return { error: UNAVAILABLE };
  }
  // The e-mail link proved who this is: earlier wrong passwords no longer block logging in.
  await clearHits(`login:email:${user.email.trim().toLowerCase()}`);
  redirect("/admin?wachtwoord=gewijzigd");
}
