import Link from "next/link";
import { AuthCard } from "@/components/admin/auth-card";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata = { title: "Wachtwoord vergeten" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Wachtwoord vergeten"
      intro="Vul je e-mailadres in. Je ontvangt een link waarmee je een nieuw wachtwoord kiest."
    >
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/admin/login" className="text-ink-muted hover:text-gold">
          Terug naar inloggen
        </Link>
      </p>
    </AuthCard>
  );
}
