import { KassaNav } from "@/components/kassa/kassa-nav";
import { Toaster } from "@/components/ui/toast";
import { requireAdmin } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/** The till: its own environment with its own menu, for the same administrators as /admin. */
export default async function KassaLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin("/kassa");
  return (
    <div className="min-h-dvh bg-canvas">
      <KassaNav userName={user.name} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      <Toaster />
    </div>
  );
}
