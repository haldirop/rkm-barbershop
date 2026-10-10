import { Checkout, type TillAppointment } from "@/components/kassa/checkout";
import { PageHeader } from "@/components/admin/page-header";
import { Alert } from "@/components/ui/alert";
import { zonedNow } from "@/lib/time";
import { uuidSchema } from "@/lib/validation";
import { requireAdmin } from "@/server/auth/session";
import { isMailConfigured } from "@/server/notifications/mailer";
import { listBarbers, listProducts, listServices } from "@/server/services/catalog";
import { getCheckoutAppointment, listUnpaidAppointments } from "@/server/services/pos";

export const metadata = { title: "Afrekenen" };

type Row = Awaited<ReturnType<typeof listUnpaidAppointments>>[number];

const toTill = (a: Row): TillAppointment => ({
  id: a.id,
  time: a.startTime.slice(0, 5),
  customerName: `${a.firstName} ${a.lastName}`,
  email: a.email,
  serviceId: a.serviceId,
  serviceName: a.serviceName,
  priceCents: a.priceCents,
  barberId: a.barberId,
  barberName: a.barberName,
});

export default async function KassaPage({ searchParams }: PageProps<"/kassa">) {
  await requireAdmin("/kassa");
  const today = zonedNow().date;
  const requested = (await searchParams).afspraak;
  const appointmentId = typeof requested === "string" && uuidSchema.safeParse(requested).success ? requested : null;

  const [services, products, barbers, unpaid, linked] = await Promise.all([
    listServices({ activeOnly: true }),
    listProducts({ activeOnly: true }),
    listBarbers({ activeOnly: true }),
    listUnpaidAppointments(today),
    appointmentId ? getCheckoutAppointment(appointmentId) : null,
  ]);

  // An appointment opened from its detail page ("Afrekenen"), possibly on another day.
  const linkedProblem = !linked
    ? null
    : linked.paidReceipt
      ? `Deze afspraak is al afgerekend (bon ${linked.paidReceipt}).`
      : linked.status !== "APPROVED" && linked.status !== "COMPLETED"
        ? "Alleen een bevestigde afspraak kan worden afgerekend."
        : null;
  const preselect = linked && !linkedProblem ? toTill(linked) : null;
  const list = unpaid.map(toTill);
  if (preselect && !list.some((a) => a.id === preselect.id)) list.unshift(preselect);

  return (
    <div>
      <PageHeader title="Afrekenen" description="Reken een afspraak of een binnenloper af. Elke betaling krijgt een eigen bonnummer." />
      {linkedProblem ? <Alert tone="warning" className="mb-6">{linkedProblem}</Alert> : null}
      <Checkout
        key={preselect?.id ?? "walk-in"}
        services={services.map((s) => ({ id: s.id, name: s.name, priceCents: s.priceCents, vatRate: s.vatRate }))}
        products={products.map((p) => ({ id: p.id, name: p.name, priceCents: p.priceCents, vatRate: p.vatRate, stock: p.stock }))}
        barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
        unpaid={list}
        preselect={preselect}
        mailConfigured={isMailConfigured()}
      />
    </div>
  );
}
