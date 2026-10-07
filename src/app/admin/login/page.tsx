import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/admin/auth-card";
import { Alert } from "@/components/ui/alert";
import { authMode } from "@/server/config";
import { getCurrentUser } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Inloggen" };

const NOTICES: Record<string, { tone: "error" | "info"; text: string }> = {
  "invalid-link": { tone: "error", text: "Deze link is verlopen of al gebruikt. Vraag hieronder een nieuwe aan." },
  "no-access": { tone: "error", text: "Dit account heeft geen toegang tot het beheer." },
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getCurrentUser()) redirect("/admin");
  const { melding } = await searchParams;
  const notice = typeof melding === "string" ? NOTICES[melding] : undefined;
  return (
    <AuthCard title="Inloggen beheer" intro="Alleen voor medewerkers van RKM Barbershop.">
      {notice ? (
        <Alert tone={notice.tone} className="mt-6">
          {notice.text}
        </Alert>
      ) : null}
      <LoginForm />
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
