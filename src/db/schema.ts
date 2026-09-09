import {
  bigint, boolean, decimal, int, json,
  mysqlEnum, mysqlTable, smallint, text, timestamp, varchar, date,
} from "drizzle-orm/mysql-core";

export const zones = mysqlTable("zones", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  metaTitle: varchar("meta_title", { length: 200 }),
  metaDescription: varchar("meta_description", { length: 500 }),
  headline: varchar("headline", { length: 200 }),
  description: text("description"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),

  // Persoonlijke gegevens
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull().default(""),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  pNumber: varchar("p_number", { length: 50 }),           // Chauffeurskaart P-nummer

  // Telegram
  telegramChatId: bigint("telegram_chat_id", { mode: "number" }),
  telegramUsername: varchar("telegram_username", { length: 100 }),

  // Voertuig
  vehicleType: mysqlEnum("vehicle_type", ["sedan", "van", "luxury"]).notNull().default("sedan"),
  carBrand: varchar("car_brand", { length: 50 }),
  carModel: varchar("car_model", { length: 50 }),
  carYear: varchar("car_year", { length: 4 }),
  licensePlate: varchar("license_plate", { length: 20 }),

  // Bedrijfsgegevens
  companyName: varchar("company_name", { length: 100 }),
  address: varchar("address", { length: 200 }),
  postcode: varchar("postcode", { length: 10 }),
  city: varchar("city", { length: 50 }),
  btwNumber: varchar("btw_number", { length: 50 }),
  kvkNumber: varchar("kvk_number", { length: 20 }),

  // Betaalgegevens
  iban: varchar("iban", { length: 34 }),
  accountHolder: varchar("account_holder", { length: 100 }),
  paymentCycle: mysqlEnum("payment_cycle", ["daily", "weekly", "monthly"]).default("daily"),

  // Documenten (Telegram file_id)
  insuranceFileId: varchar("insurance_file_id", { length: 500 }),      // était 200
  insuranceExpiry: date("insurance_expiry"),
  driversLicenseFileId: varchar("drivers_license_file_id", { length: 500 }),
  driversLicenseExpiry: date("drivers_license_expiry"),
  taxiCardFileId: varchar("taxi_card_file_id", { length: 500 }),
  taxiCardExpiry: date("taxi_card_expiry"),

  // Voorwaarden
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),

  // Status
  isVerified: boolean("is_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(false),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull().default("15.00"),
  totalTrips: int("total_trips").notNull().default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  reference: varchar("reference", { length: 20 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerEmail: varchar("customer_email", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  passengers: smallint("passengers").notNull().default(1),
  luggage: smallint("luggage").notNull().default(1),
  zoneId: int("zone_id").references(() => zones.id),
  pickupAddress: varchar("pickup_address", { length: 255 }).notNull(),
  dropoffAddress: varchar("dropoff_address", { length: 255 }).notNull(),
  distanceKm: decimal("distance_km", { precision: 8, scale: 2 }).notNull(),
  durationMinutes: int("duration_minutes"),
  pickupDatetime: timestamp("pickup_datetime").notNull(),
  flightNumber: varchar("flight_number", { length: 20 }),
  vehicleType: mysqlEnum("vehicle_type", ["sedan", "van", "luxury"]).notNull().default("sedan"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull().default("4.00"),
  pricePerKm: decimal("price_per_km", { precision: 5, scale: 2 }).notNull().default("2.50"),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  offeredPrice:        decimal("offered_price", { precision: 10, scale: 2 }),
  telegramGroupMsgId:  bigint("telegram_group_msg_id", { mode: "number" }),
  driverId: int("driver_id").references(() => drivers.id),
  driverAcceptedAt: timestamp("driver_accepted_at"),
  status: mysqlEnum("status", ["pending", "paid", "sent_to_drivers", "accepted", "driver_on_way", "passenger_picked", "completed", "cancelled"]).notNull().default("pending"),
  customerNotes: text("customer_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("booking_id").notNull().references(() => bookings.id),
  transactionId: varchar("transaction_id", { length: 100 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("EUR"),
  method: varchar("method", { length: 50 }),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).notNull().default("pending"),
  gatewayResponse: json("gateway_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const telegramNotifications = mysqlTable("telegram_notifications", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("booking_id").notNull().references(() => bookings.id),
  driverId: int("driver_id").references(() => drivers.id),
  messageId: bigint("message_id", { mode: "number" }).notNull(),
  chatId: bigint("chat_id", { mode: "number" }).notNull(),
  status: mysqlEnum("status", ["sent", "accepted", "expired"]).notNull().default("sent"),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),

  // Qui a fait l'action
  adminId:   int("admin_id").references(() => admins.id),
  adminName: varchar("admin_name", { length: 100 }),   // snapshot du nom au moment de l'action

  // Quelle action
  action: varchar("action", { length: 100 }).notNull(),
  // ex: "driver.verified", "driver.deleted", "booking.status_changed", "driver.updated"

  // Sur quelle entité
  entityType: mysqlEnum("entity_type", ["driver", "booking", "zone", "admin"]).notNull(),
  entityId:   int("entity_id"),
  entityLabel: varchar("entity_label", { length: 200 }), // ex: "Jean Dupont" ou "REF-12345"

  // Détail du changement (avant / après)
  meta: json("meta"),
  // ex: { before: { status: "pending" }, after: { status: "accepted" } }

  createdAt: timestamp("created_at").notNull().defaultNow(),
});
