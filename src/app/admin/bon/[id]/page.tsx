import { notFound } from "next/navigation";
import { ReceiptView } from "@/components/admin/pos/receipt";
import { uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { getSale } from "@/server/services/pos";
import { getSettings } from "@/server/services/settings";
import { PrintControls } from "./print-controls";

export const metadata = { title: "Bon printen" };
export const dynamic = "force-dynamic";

/** The receipt on its own, for printing (80 mm receipt printer or A4). */
export default async function PrintReceiptPage({ params, searchParams }: PageProps<"/admin/bon/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const [detail, settings] = await Promise.all([getSale(id), getSettings()]);
  if (!detail) notFound();

  return (
    <main className="min-h-dvh space-y-6 bg-canvas px-4 py-8 print:bg-white print:p-0">
      <style>{"@media print { body { background: #fff !important; } @page { margin: 6mm; } }"}</style>
      <PrintControls autoPrint={(await searchParams).print === "1"} />
      <ReceiptView detail={detail} settings={settings} className="rounded-xl print:rounded-none print:p-0" />
    </main>
  );
}
