import { AdminMobileBar, AdminSidebar } from "@/components/admin/admin-nav";
import { Toaster } from "@/components/ui/toast";
import { requireAdmin } from "@/server/auth/session";
import { countByStatus } from "@/server/services/appointments";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const counts = await countByStatus();
  return (
    <div className="min-h-dvh bg-canvas">
      <AdminSidebar pending={counts.PENDING} userName={user.name} />
      <AdminMobileBar pending={counts.PENDING} userName={user.name} />
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
