import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/auth-card";
import { Alert } from "@/components/ui/alert";
import { authMode } from "@/server/config";
import { getCurrentUser, safeReturnPath } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Inloggen" };

const NOTICES: Record<string, { tone: "error" | "info"; text: string }> = {
  "invalid-link": { tone: "error", text: "Deze link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan." },
  "no-access": { tone: "error", text: "Dit account heeft geen toegang tot het beheer." },
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { melding, naar } = await searchParams;
  const returnTo = safeReturnPath(naar);
  if (await getCurrentUser()) redirect(returnTo ?? "/admin");
  const notice = typeof melding === "string" ? NOTICES[melding] : undefined;
  const toTill = returnTo?.startsWith("/kassa");
  return (
    <AuthCard title={toTill ? "Inloggen kassa" : "Inloggen beheer"} intro="Alleen voor medewerkers van RKM Barbershop.">
      {notice ? (
        <Alert tone={notice.tone} className="mt-6">
          {notice.text}
        </Alert>
      ) : null}
      <LoginForm returnTo={returnTo} />
      {authMode() === "supabase" ? (
        <p className="mt-6 text-center text-sm">
          <Link href="/admin/wachtwoord-vergeten" className="text-ink-muted hover:text-gold">
            Wachtwoord vergeten?
          </Link>
        </p>
      ) : null}
    </AuthCard>
  );
}
