"use client";

import { Banknote, CircleCheck, CreditCard, LoaderCircle, Minus, Package, Plus, Printer, Receipt, Scissors, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { checkoutAction, type CheckoutResult } from "@/app/admin/actions/pos";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { formatAmount } from "@/lib/format";
import { centsToInput, PAYMENT_METHODS, parseEuroCents, priceSale, type Discount, type PaymentMethodKey } from "@/lib/pos";

export interface TillItem {
  id: string;
  name: string;
  priceCents: number;
  vatRate: number;
}

export interface TillProduct extends TillItem {
  /** null = stock not tracked */
  stock: number | null;
}

export interface TillAppointment {
  id: string;
  time: string;
  customerName: string;
  email: string | null;
  serviceId: string | null;
  serviceName: string;
  priceCents: number;
  barberId: string | null;
  barberName: string;
}

interface Line {
  key: string;
  kind: "SERVICE" | "PRODUCT";
  id: string;
  name: string;
  quantity: number;
  /** As typed, e.g. "25,00". */
  price: string;
  vatRate: number;
}

const METHOD_ICONS = { CASH: Banknote, CARD: CreditCard, OTHER: Smartphone } as const;

let lineKey = 0;
const newLine = (kind: Line["kind"], item: TillItem, priceCents = item.priceCents): Line => ({
  key: `l${++lineKey}`,
  kind,
  id: item.id,
  name: item.name,
  quantity: 1,
  price: centsToInput(priceCents),
  vatRate: item.vatRate,
});

/** The till: pick an appointment or items, then take the payment. */
export function Checkout({
  services,
  products,
  barbers,
  unpaid,
  preselect,
  mailConfigured,
}: {
  services: TillItem[];
  products: TillProduct[];
  barbers: Array<{ id: string; name: string }>;
  unpaid: TillAppointment[];
  preselect: TillAppointment | null;
  mailConfigured: boolean;
}) {
  const router = useRouter();
  const onlyBarber = barbers.length === 1 ? barbers[0].id : "";
  const linesFor = (a: TillAppointment | null) => {
    const service = a?.serviceId ? services.find((s) => s.id === a.serviceId) : null;
    const fallback = a?.serviceId ? { id: a.serviceId, name: a.serviceName, priceCents: a.priceCents, vatRate: 9 } : null;
    const item = service ?? fallback;
    return a && item ? [newLine("SERVICE", { ...item, name: a.serviceName }, a.priceCents)] : [];
  };

  const [appointment, setAppointment] = useState<TillAppointment | null>(preselect);
  const [lines, setLines] = useState<Line[]>(() => linesFor(preselect));
  const [barberId, setBarberId] = useState(preselect?.barberId ?? onlyBarber);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountInput, setDiscountInput] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [method, setMethod] = useState<PaymentMethodKey | null>(null);
  const [receivedInput, setReceivedInput] = useState("");
  const [mailReceipt, setMailReceipt] = useState(Boolean(preselect?.email));
  const [email, setEmail] = useState(preselect?.email ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Extract<CheckoutResult, { ok: true }> & { changeCents: number | null } | null>(null);
  const [pending, startTransition] = useTransition();

  function load(a: TillAppointment) {
    setAppointment(a);
    setLines(linesFor(a));
    setBarberId(a.barberId ?? onlyBarber);
    setEmail(a.email ?? "");
    setMailReceipt(Boolean(a.email));
    setError(null);
  }

  function reset() {
    setAppointment(null);
    setLines([]);
    setBarberId(onlyBarber);
    setDiscountInput("");
    setTipInput("");
    setMethod(null);
    setReceivedInput("");
    setMailReceipt(false);
    setEmail("");
    setNote("");
    setError(null);
    setResult(null);
    router.refresh();
  }

  function add(kind: Line["kind"], item: TillItem) {
    setLines((current) => {
      const existing = current.find((l) => l.kind === kind && l.id === item.id && parseEuroCents(l.price) === item.priceCents);
      if (existing) return current.map((l) => (l === existing ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l));
      return [...current, newLine(kind, item)];
    });
  }

  const update = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => setLines((current) => current.filter((l) => l.key !== key));

  // Totals, with exactly the same calculation as the server.
  const prices = lines.map((l) => parseEuroCents(l.price));
  const pricesValid = prices.every((p) => p !== null);
  const discountValue = discountInput.trim() ? (discountType === "amount" ? parseEuroCents(discountInput) : Number(discountInput.replace(",", "."))) : 0;
  const discountValid =
    discountValue !== null && Number.isFinite(discountValue) && discountValue >= 0 && (discountType === "amount" || discountValue <= 100);
  const discount: Discount | null = !discountValid || !discountValue
    ? null
    : discountType === "amount"
      ? { type: "amount", cents: discountValue }
      : { type: "percent", percent: discountValue };
  const tipCents = tipInput.trim() ? parseEuroCents(tipInput) : 0;
  const priced = priceSale(
    lines.map((l, i) => ({ quantity: l.quantity, unitPriceCents: prices[i] ?? 0, vatRate: l.vatRate })),
    { discount, tipCents: tipCents ?? 0 },
  );
  const receivedCents = receivedInput.trim() ? parseEuroCents(receivedInput) : null;
  const changeCents = method === "CASH" && receivedCents !== null ? receivedCents - priced.totalCents : null;
  const emailValid = !mailReceipt || /^\S+@\S+\.\S+$/.test(email.trim());

  const problems = [
    !lines.length && "Voeg een behandeling of product toe.",
    !pricesValid && "Controleer de prijzen.",
    !discountValid && "Controleer de korting.",
    tipCents === null && "Controleer de fooi.",
    !method && "Kies hoe er betaald wordt.",
    changeCents !== null && changeCents < 0 && "Het ontvangen bedrag is lager dan het totaal.",
    !emailValid && "Vul een geldig e-mailadres in voor de bon.",
  ].filter(Boolean) as string[];

  function submit() {
    if (problems.length || !method) return;
    setError(null);
    startTransition(async () => {
      const response = await checkoutAction({
        appointmentId: appointment?.id ?? null,
        barberId: barberId || null,
        items: lines.map((l, i) => ({ kind: l.kind, id: l.id, quantity: l.quantity, unitPriceCents: prices[i] ?? 0 })),
        discount,
        tipCents: tipCents ?? 0,
        paymentMethod: method,
        note,
        receiptEmail: mailReceipt ? email : "",
      });
      if (response.ok) setResult({ ...response, changeCents });
      else setError(response.error);
    });
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-400/30 bg-surface p-6 text-center sm:p-8" role="status">
        <CircleCheck className="mx-auto size-12 text-emerald-400" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold text-ink">Afgerekend · bon {result.number}</h2>
        <p className="mt-2 text-3xl font-semibold text-gold-bright tabular-nums">{formatAmount(result.totalCents)}</p>
        {result.changeCents !== null && result.changeCents > 0 ? (
          <p className="mt-3 text-lg text-ink">
            Wisselgeld terug: <span className="font-semibold tabular-nums">{formatAmount(result.changeCents)}</span>
          </p>
        ) : null}
        {result.email ? (
          <Alert tone={result.email.ok ? "success" : "error"} className="mt-5 text-left">
            {result.email.ok ? `De bon is gemaild naar ${result.email.to}.` : `Mailen mislukt: ${result.email.error ?? "onbekende fout"}`}
          </Alert>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <ButtonLink href={`/admin/bon/${result.saleId}?print=1`} target="_blank" variant="secondary">
            <Printer className="size-4" aria-hidden /> Bon printen
          </ButtonLink>
          <ButtonLink href={`/admin/kassa/bonnen/${result.saleId}`} variant="secondary">
            <Receipt className="size-4" aria-hidden /> Bon bekijken
          </ButtonLink>
          <Button onClick={reset}>Volgende klant</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_25rem]">
      <div className="min-w-0 space-y-8">
        <section aria-labelledby="unpaid-title">
          <h2 id="unpaid-title" className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
            Afspraken van vandaag
          </h2>
          {unpaid.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {unpaid.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => load(a)}
                    aria-pressed={appointment?.id === a.id}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors",
                      appointment?.id === a.id ? "border-gold bg-gold/[0.07]" : "border-line bg-surface hover:border-gold/50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">
                        {a.time} · {a.customerName}
                      </span>
                      <span className="block truncate text-sm text-ink-muted">
                        {a.serviceName} · {a.barberName}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold text-gold-bright tabular-nums">{formatAmount(a.priceCents)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-ink-muted">
              Geen bevestigde afspraken meer om af te rekenen vandaag. Een binnenloper reken je hieronder af.
            </p>
          )}
        </section>

        <section aria-labelledby="services-title">
          <h2 id="services-title" className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-ink-muted uppercase">
            <Scissors className="size-4 text-gold" aria-hidden /> Behandelingen
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {services.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => add("SERVICE", s)}
                  className="flex h-full w-full flex-col justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-gold/50 active:scale-[0.98]"
                >
                  <span className="text-sm font-medium text-ink">{s.name}</span>
                  <span className="text-sm font-semibold text-gold-bright tabular-nums">{formatAmount(s.priceCents)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="products-title">
          <h2 id="products-title" className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-ink-muted uppercase">
            <Package className="size-4 text-gold" aria-hidden /> Producten
          </h2>
          {products.length ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {products.map((p) => {
                const soldOut = p.stock !== null && p.stock <= 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => add("PRODUCT", p)}
                      disabled={soldOut}
                      className="flex h-full w-full flex-col justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-gold/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="text-sm font-medium text-ink">{p.name}</span>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-gold-bright tabular-nums">{formatAmount(p.priceCents)}</span>
                        {p.stock !== null ? (
                          <span className="text-xs text-ink-faint">{soldOut ? "Op" : `${p.stock} op voorraad`}</span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong p-4 text-sm text-ink-muted">
              Nog geen producten. Verkoop je wax, shampoo of iets anders? Voeg het toe onder{" "}
              <Link href="/admin/producten" className="text-gold underline-offset-2 hover:underline">
                Producten
              </Link>
              , dan verschijnt het hier.
            </p>
          )}
        </section>

        {lines.length ? (
          // Phones: the receipt is below the lists, so offer a shortcut to it.
          <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:hidden">
            <Button
              className="w-full"
              onClick={() => document.getElementById("receipt")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <Receipt className="size-4" aria-hidden /> Naar de bon · {lines.reduce((n, l) => n + l.quantity, 0)} ·{" "}
              {formatAmount(priced.totalCents)}
            </Button>
          </div>
        ) : null}
      </div>

      <section id="receipt" aria-labelledby="receipt-title" className="scroll-mt-20 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-line bg-surface">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id="receipt-title" className="text-base font-semibold text-ink">
                Bon
              </h2>
              <p className="truncate text-sm text-ink-muted">
                {appointment ? `Afspraak ${appointment.time} · ${appointment.customerName}` : "Losse verkoop"}
              </p>
            </div>
            {appointment ? (
              <button
                type="button"
                onClick={() => {
                  setAppointment(null);
                  setLines([]);
                }}
                className="shrink-0 text-sm text-ink-muted hover:text-ink"
              >
                Losmaken
              </button>
            ) : null}
          </div>

          <div className="space-y-5 p-5">
            {barbers.length > 1 ? (
              <Field label="Barber" htmlFor="till-barber">
                <Select id="till-barber" value={barberId} onChange={(e) => setBarberId(e.target.value)}>
                  <option value="">Geen barber</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {lines.length ? (
              <ul className="divide-y divide-line">
                {lines.map((line, i) => (
                  <li key={line.key} className="py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-ink">{line.name}</span>
                      <button
                        type="button"
                        onClick={() => remove(line.key)}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-surface-3 hover:text-ink"
                        aria-label={`${line.name} verwijderen`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-full border border-line-strong">
                        <button
                          type="button"
                          onClick={() => update(line.key, { quantity: Math.max(1, line.quantity - 1) })}
                          className="grid size-9 place-items-center text-ink-muted hover:text-ink disabled:opacity-30"
                          disabled={line.quantity <= 1}
                          aria-label="Eén minder"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-label="Aantal">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => update(line.key, { quantity: Math.min(99, line.quantity + 1) })}
                          className="grid size-9 place-items-center text-ink-muted hover:text-ink"
                          aria-label="Eén meer"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <label className="sr-only" htmlFor={`price-${line.key}`}>
                        Prijs per stuk voor {line.name}
                      </label>
                      <div className="relative w-28">
                        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-faint">€</span>
                        <Input
                          id={`price-${line.key}`}
                          inputMode="decimal"
                          value={line.price}
                          onChange={(e) => update(line.key, { price: e.target.value })}
                          aria-invalid={prices[i] === null}
                          className="h-10 pl-7 text-right tabular-nums"
                        />
                      </div>
                      <span className="ml-auto font-semibold text-ink tabular-nums">
                        {formatAmount(priced.lines[i]?.totalCents ?? 0)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-line-strong p-4 text-center text-sm text-ink-muted">
                Kies een afspraak, behandeling of product.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-ink-muted">
                  <label htmlFor="till-discount">Korting</label>
                  <span className="flex rounded-full border border-line-strong p-0.5 text-xs" role="group" aria-label="Soort korting">
                    {(["amount", "percent"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDiscountType(type)}
                        aria-pressed={discountType === type}
                        className={cn("rounded-full px-2 py-0.5", discountType === type ? "bg-gold text-canvas" : "text-ink-muted")}
                      >
                        {type === "amount" ? "€" : "%"}
                      </button>
                    ))}
                  </span>
                </span>
                <Input
                  id="till-discount"
                  inputMode="decimal"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder={discountType === "amount" ? "0,00" : "0"}
                  aria-invalid={!discountValid}
                  className="h-11"
                />
              </div>
              <Field label="Fooi" htmlFor="till-tip">
                <Input
                  id="till-tip"
                  inputMode="decimal"
                  value={tipInput}
                  onChange={(e) => setTipInput(e.target.value)}
                  placeholder="0,00"
                  aria-invalid={tipCents === null}
                  className="h-11"
                />
              </Field>
            </div>

            <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
              {priced.discountCents || priced.tipCents ? (
                <div className="flex justify-between text-ink-muted">
                  <dt>Subtotaal</dt>
                  <dd className="tabular-nums">{formatAmount(priced.subtotalCents)}</dd>
                </div>
              ) : null}
              {priced.discountCents ? (
                <div className="flex justify-between text-ink-muted">
                  <dt>Korting</dt>
                  <dd className="tabular-nums">−{formatAmount(priced.discountCents)}</dd>
                </div>
              ) : null}
              {priced.tipCents ? (
                <div className="flex justify-between text-ink-muted">
                  <dt>Fooi</dt>
                  <dd className="tabular-nums">{formatAmount(priced.tipCents)}</dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between pt-1">
                <dt className="text-base font-semibold text-ink">Totaal</dt>
                <dd className="text-2xl font-semibold text-gold-bright tabular-nums">{formatAmount(priced.totalCents)}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-sm font-medium text-ink-muted">Betaald met</p>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Betaalwijze">
                {(Object.keys(PAYMENT_METHODS) as PaymentMethodKey[]).map((key) => {
                  const Icon = METHOD_ICONS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      aria-pressed={method === key}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-sm font-medium transition-colors",
                        method === key ? "border-gold bg-gold/10 text-gold-bright" : "border-line-strong text-ink-muted hover:border-gold/50 hover:text-ink",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                      {PAYMENT_METHODS[key]}
                    </button>
                  );
                })}
              </div>
              {method === "OTHER" ? (
                <p className="mt-2 text-xs text-ink-faint">Bijvoorbeeld Tikkie of een overboeking. Zet in de opmerking hoe.</p>
              ) : null}
            </div>

            {method === "CASH" ? (
              <div className="grid grid-cols-2 items-end gap-3">
                <Field label="Ontvangen" htmlFor="till-received">
                  <Input
                    id="till-received"
                    inputMode="decimal"
                    value={receivedInput}
                    onChange={(e) => setReceivedInput(e.target.value)}
                    placeholder={centsToInput(priced.totalCents)}
                    className="h-11"
                  />
                </Field>
                <p className="pb-2.5 text-sm text-ink-muted">
                  Terug:{" "}
                  <span className={cn("font-semibold tabular-nums", changeCents !== null && changeCents < 0 ? "text-red-300" : "text-ink")}>
                    {changeCents === null ? "—" : formatAmount(Math.max(0, changeCents))}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="space-y-3 border-t border-line pt-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
                <Checkbox checked={mailReceipt} onChange={(e) => setMailReceipt(e.target.checked)} /> Bon mailen
              </label>
              {mailReceipt ? (
                <Input
                  type="email"
                  inputMode="email"
                  aria-label="E-mailadres voor de bon"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="klant@voorbeeld.nl"
                  aria-invalid={!emailValid}
                  className="h-11"
                />
              ) : null}
              {mailReceipt && !mailConfigured ? (
                <p className="text-xs text-amber-200">E-mail is nog niet gekoppeld (Resend): de bon wordt dan alleen gelogd, niet verstuurd.</p>
              ) : null}
              <Input
                aria-label="Opmerking (alleen intern)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="Opmerking (optioneel, alleen intern)"
                className="h-11"
              />
            </div>

            {error ? <Alert tone="error">{error}</Alert> : null}

            <Button size="lg" className="w-full" onClick={submit} disabled={pending || problems.length > 0}>
              {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Receipt className="size-5" aria-hidden />}
              {pending ? "Bezig…" : `Afrekenen · ${formatAmount(priced.totalCents)}`}
            </Button>
            {problems.length && lines.length ? <p className="text-center text-xs text-ink-faint">{problems[0]}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
