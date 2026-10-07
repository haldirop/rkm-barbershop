"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { passwordProblem } from "@/server/auth/password";
import { clearHits, clientIp, isRateLimited, recordHit } from "@/server/auth/rate-limit";
import {
  changeOwnPassword,
  requestPasswordReset,
  requireAdmin,
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

  const keys = [`login:ip:${await clientIp()}`, `login:email:${email}`];
  for (const key of keys) {
    if (await isRateLimited(key, 5, 15)) {
      return { error: "Te veel mislukte pogingen. Wacht 15 minuten en probeer het opnieuw.", values: { email } };
    }
  }

  let result;
  try {
    result = await signIn(parsed.data.email, parsed.data.password);
  } catch (error) {
    console.error("[auth] Inloggen mislukt:", error);
    return { error: UNAVAILABLE, values: { email } };
  }
  if (!result.ok) {
    await Promise.all(keys.map(recordHit));
    return { error: result.error, values: { email } };
  }
  await clearHits(`login:email:${email}`);
  redirect("/admin");
}

export async function logout() {
  try {
    await signOut();
  } catch (error) {
    console.error("[auth] Uitloggen mislukt:", error);
  }
  redirect("/admin/login");
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
  await requireAdmin();
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
  redirect("/admin?wachtwoord=gewijzigd");
}
