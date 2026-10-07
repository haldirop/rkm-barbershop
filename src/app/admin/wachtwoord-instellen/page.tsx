import { AuthCard } from "@/components/admin/auth-card";
import { requireAdmin } from "@/server/auth/session";
import { NewPasswordForm } from "./new-password-form";

export const metadata = { title: "Nieuw wachtwoord" };

export default async function NewPasswordPage() {
  const user = await requireAdmin();
  return (
    <AuthCard title="Kies een nieuw wachtwoord" intro={`Voor ${user.email}`}>
      <NewPasswordForm />
    </AuthCard>
  );
}
