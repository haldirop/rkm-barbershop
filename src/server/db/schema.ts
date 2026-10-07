import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Database schema for RKM Barbershop.
 *
 * Conventions:
 * - Dates (`date`) and times (`time`) are local shop time (Europe/Amsterdam).
 *   A barbershop has one location, so storing wall-clock time avoids DST bugs.
 * - Weekdays use ISO numbering: 1 = maandag … 7 = zondag.
 * - Money is stored in cents.
 * - Double bookings are prevented by an exclusion constraint on `appointments`
 *   (see drizzle/0001_appointment_overlap.sql), on top of the application check.
 */

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const appointmentStatus = pgEnum("appointment_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
]);

export const userRole = pgEnum("user_role", ["OWNER", "ADMIN"]);

export const actorType = pgEnum("actor_type", ["CUSTOMER", "ADMIN", "SYSTEM"]);

export const appointmentSource = pgEnum("appointment_source", ["ONLINE", "ADMIN"]);

export const emailStatus = pgEnum("email_status", ["SENT", "LOGGED", "FAILED"]);

// ---------------------------------------------------------------------------
// Beheerders & sessies
// ---------------------------------------------------------------------------

/**
 * Who may use /admin. In production people log in with Supabase Auth and are
 * matched on auth_user_id (or, the first time, on their verified e-mail address).
 * password_hash is only used by the local development login.
 */
export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    authUserId: uuid("auth_user_id"),
    passwordHash: text("password_hash"),
    role: userRole("role").notNull().default("ADMIN"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("admin_users_email_key").on(t.email),
    uniqueIndex("admin_users_auth_user_key").on(t.authUserId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    /** Local development login only. SHA-256 hash of the token; the raw token lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Sliding-window rate limiting (login attempts, booking requests). */
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_limit_events_key_idx").on(t.key, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Bedrijf: barbers, diensten, openingstijden, blokkades
// ---------------------------------------------------------------------------

export const barbers = pgTable("barbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  bio: text("bio"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

export const barberWorkingHours = pgTable(
  "barber_working_hours",
  {
    barberId: uuid("barber_id")
      .notNull()
      .references(() => barbers.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    isWorking: boolean("is_working").notNull().default(true),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.barberId, t.weekday] }),
    check("barber_hours_weekday_chk", sql`${t.weekday} BETWEEN 1 AND 7`),
    check("barber_hours_range_chk", sql`${t.endTime} > ${t.startTime}`),
  ],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    priceCents: integer("price_cents").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    check("services_price_chk", sql`${t.priceCents} >= 0`),
    check("services_duration_chk", sql`${t.durationMinutes} BETWEEN 5 AND 480`),
  ],
);

export const businessHours = pgTable(
  "business_hours",
  {
    weekday: smallint("weekday").primaryKey(),
    isOpen: boolean("is_open").notNull().default(true),
    openTime: time("open_time").notNull(),
    closeTime: time("close_time").notNull(),
  },
  (t) => [
    check("business_hours_weekday_chk", sql`${t.weekday} BETWEEN 1 AND 7`),
    check("business_hours_range_chk", sql`${t.closeTime} > ${t.openTime}`),
  ],
);

/** Terugkerende pauzes per weekdag. `barberId` null = geldt voor de hele zaak. */
export const breaks = pgTable(
  "breaks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekday: smallint("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    label: text("label"),
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("breaks_weekday_chk", sql`${t.weekday} BETWEEN 1 AND 7`),
    check("breaks_range_chk", sql`${t.endTime} > ${t.startTime}`),
  ],
);

/**
 * Eenmalige blokkades (vakantie, feestdag, "vrijdag 15:00-17:00 gesloten").
 * Zonder tijden = hele dag(en). `barberId` null = hele zaak.
 */
export const blockedTimes = pgTable(
  "blocked_times",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("blocked_times_dates_idx").on(t.startDate, t.endDate),
    check("blocked_times_dates_chk", sql`${t.endDate} >= ${t.startDate}`),
    check(
      "blocked_times_times_chk",
      sql`(${t.startTime} IS NULL AND ${t.endTime} IS NULL) OR (${t.startTime} IS NOT NULL AND ${t.endTime} IS NOT NULL AND ${t.endTime} > ${t.startTime})`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Klanten & afspraken
// ---------------------------------------------------------------------------

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    /** Lowercased. Optional for bookings the shop enters by phone. */
    email: text("email"),
    phone: text("phone").notNull(),
    preferredBarberId: uuid("preferred_barber_id").references(() => barbers.id, {
      onDelete: "set null",
    }),
    adminNotes: text("admin_notes"),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("customers_email_key").on(t.email).where(sql`${t.email} IS NOT NULL`),
    index("customers_phone_idx").on(t.phone),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    barberId: uuid("barber_id").references(() => barbers.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "set null" }),
    // Snapshots, so history and revenue stay correct after a service/barber changes.
    barberName: text("barber_name").notNull(),
    serviceName: text("service_name").notNull(),
    priceCents: integer("price_cents").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    status: appointmentStatus("status").notNull().default("PENDING"),
    /** Klant koos "geen voorkeur": bij verplaatsen mag elke barber worden gekozen. */
    anyBarber: boolean("any_barber").notNull().default(false),
    notes: text("notes"),
    adminNotes: text("admin_notes"),
    statusReason: text("status_reason"),
    source: appointmentSource("source").notNull().default("ONLINE"),
    cancelledBy: actorType("cancelled_by"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index("appointments_date_idx").on(t.date, t.startTime),
    index("appointments_status_idx").on(t.status),
    index("appointments_customer_idx").on(t.customerId),
    index("appointments_barber_date_idx").on(t.barberId, t.date),
    check("appointments_range_chk", sql`${t.endTime} > ${t.startTime}`),
  ],
);

export const appointmentEvents = pgTable(
  "appointment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    actor: actorType("actor").notNull(),
    actorUserId: uuid("actor_user_id").references(() => adminUsers.id, { onDelete: "set null" }),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("appointment_events_appointment_idx").on(t.appointmentId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Content, notificaties & instellingen
// ---------------------------------------------------------------------------

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorName: text("author_name").notNull(),
    rating: smallint("rating").notNull(),
    body: text("body").notNull(),
    source: text("source"),
    isPublished: boolean("is_published").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    ...timestamps,
  },
  (t) => [check("reviews_rating_chk", sql`${t.rating} BETWEEN 1 AND 5`)],
);

export const emailLog = pgTable(
  "email_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    template: text("template").notNull(),
    recipient: text("recipient").notNull(),
    subject: text("subject").notNull(),
    status: emailStatus("status").notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_log_appointment_idx").on(t.appointmentId)],
);

/** Single-row table (id = 1) with business details and booking rules. */
export const settings = pgTable(
  "settings",
  {
    id: smallint("id").primaryKey().default(1),
    businessName: text("business_name").notNull().default("RKM Barbershop"),
    tagline: text("tagline").notNull().default("Strak geknipt. Zelfverzekerd naar buiten."),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    street: text("street").notNull().default(""),
    postalCode: text("postal_code").notNull().default(""),
    city: text("city").notNull().default(""),
    instagramUrl: text("instagram_url"),
    facebookUrl: text("facebook_url"),
    googleReviewsUrl: text("google_reviews_url"),
    kvkNumber: text("kvk_number"),
    /** Where "nieuwe aanvraag" notifications go. Falls back to `email`. */
    notificationEmail: text("notification_email"),
    slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(15),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    minLeadMinutes: integer("min_lead_minutes").notNull().default(60),
    bookingHorizonDays: integer("booking_horizon_days").notNull().default(60),
    cancellationCutoffHours: integer("cancellation_cutoff_hours").notNull().default(24),
    /** Reminders go out the day before the appointment, from this local time. */
    remindersEnabled: boolean("reminders_enabled").notNull().default(true),
    reminderSendTime: time("reminder_send_time").notNull().default("17:00"),
    maxOpenAppointmentsPerCustomer: integer("max_open_appointments_per_customer")
      .notNull()
      .default(3),
    /** Set the first time the owner saves the business details in /admin. */
    detailsConfirmedAt: timestamp("details_confirmed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check("settings_singleton_chk", sql`${t.id} = 1`),
    check("settings_interval_chk", sql`${t.slotIntervalMinutes} IN (5, 10, 15, 20, 30, 60)`),
  ],
);

export type AppointmentStatus = (typeof appointmentStatus.enumValues)[number];
export type Appointment = typeof appointments.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Barber = typeof barbers.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type Review = typeof reviews.$inferSelect;
