import { notFound } from "next/navigation";
import { saveAppointment } from "@/app/admin/actions/appointments";
import { AppointmentForm } from "@/components/admin/appointment-form";
import { PageHeader } from "@/components/admin/page-header";
import { uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { getAppointmentDetail } from "@/server/services/appointments";
import { listBarbers, listServices } from "@/server/services/catalog";

export const metadata = { title: "Afspraak bewerken" };

export default async function EditAppointmentPage({ params }: PageProps<"/admin/afspraken/[id]/bewerken">) {
  await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const [detail, services, barbers] = await Promise.all([getAppointmentDetail(id), listServices(), listBarbers()]);
  if (!detail) notFound();
  const { appointment: a, customer: c } = detail;

  return (
    <div>
      <PageHeader
        back={{ href: `/admin/afspraken/${a.id}`, label: "Terug naar afspraak" }}
        title="Afspraak bewerken"
        description={`${c.firstName} ${c.lastName} · ${c.phone}`}
      />
      <AppointmentForm
        mode="edit"
        action={saveAppointment}
        services={services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, priceCents: s.priceCents }))}
        barbers={barbers.map((b) => ({ id: b.id, name: b.isActive ? b.name : `${b.name} (inactief)` }))}
        initial={{
          id: a.id,
          serviceId: a.serviceId ?? "",
          barberId: a.barberId ?? "",
          date: a.date,
          startTime: a.startTime.slice(0, 5),
          durationMinutes: a.durationMinutes,
          priceCents: a.priceCents,
          notes: a.notes ?? "",
          adminNotes: a.adminNotes ?? "",
          status: a.status,
          hasEmail: Boolean(c.email),
        }}
      />
    </div>
  );
}
