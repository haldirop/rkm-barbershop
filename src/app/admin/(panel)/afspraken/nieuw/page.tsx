import { createAppointment } from "@/app/admin/actions/appointments";
import { AppointmentForm } from "@/components/admin/appointment-form";
import { PageHeader } from "@/components/admin/page-header";
import { isIsoDate, isTimeString, zonedNow } from "@/lib/time";
import { requireAdmin } from "@/server/auth/session";
import { listBarbers, listServices } from "@/server/services/catalog";
import { getCustomerDetail } from "@/server/services/customers";
import { uuidSchema } from "@/lib/validation";

export const metadata = { title: "Nieuwe afspraak" };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewAppointmentPage({ searchParams }: PageProps<"/admin/afspraken/nieuw">) {
  await requireAdmin();
  const params = await searchParams;
  const customerId = one(params.klant);
  const [services, barbers, customer] = await Promise.all([
    listServices({ activeOnly: true }),
    listBarbers({ activeOnly: true }),
    customerId && uuidSchema.safeParse(customerId).success ? getCustomerDetail(customerId) : null,
  ]);
  const date = one(params.datum);
  const time = one(params.tijd);
  const barber = one(params.barber);
  const first = services[0];

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/afspraken", label: "Alle afspraken" }}
        title="Nieuwe afspraak"
        description="Voor telefonische of persoonlijke boekingen. Dubbele boekingen worden automatisch voorkomen."
      />
      <AppointmentForm
        mode="new"
        action={createAppointment}
        services={services.map((s) => ({ id: s.id, name: s.name, durationMinutes: s.durationMinutes, priceCents: s.priceCents }))}
        barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
        initialCustomer={
          customer
            ? { id: customer.id, firstName: customer.firstName, lastName: customer.lastName, phone: customer.phone, email: customer.email }
            : null
        }
        initial={{
          serviceId: first?.id ?? "",
          barberId: barbers.some((b) => b.id === barber) ? barber! : (barbers[0]?.id ?? ""),
          date: date && isIsoDate(date) ? date : zonedNow().date,
          startTime: time && isTimeString(time) ? time.slice(0, 5) : "",
          durationMinutes: first?.durationMinutes ?? 30,
          priceCents: first?.priceCents ?? 0,
          notes: "",
          adminNotes: "",
        }}
      />
    </div>
  );
}
