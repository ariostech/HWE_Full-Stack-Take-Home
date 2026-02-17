import {
  pgTable,
  uuid,
  varchar,
  numeric,
  jsonb,
  integer,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const sites = pgTable("sites", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 500 }).notNull(),
  emission_limit: numeric("emission_limit", {
    precision: 18,
    scale: 6,
  }).notNull(),
  total_emissions_to_date: numeric("total_emissions_to_date", {
    precision: 18,
    scale: 6,
  })
    .notNull()
    .default("0"),
  metadata: jsonb("metadata").notNull().default({}),
  version: integer("version").notNull().default(1),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const measurements = pgTable(
  "measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    site_id: uuid("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    value: numeric("value", { precision: 18, scale: 6 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull().default("kg"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    source: varchar("source", { length: 50 }).notNull().default("sensor"),
    metadata: jsonb("metadata").notNull().default({}),
    batch_id: uuid("batch_id"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_measurements_site_id").on(table.site_id),
    index("idx_measurements_timestamp").on(table.timestamp),
    index("idx_measurements_batch_id").on(table.batch_id),
    index("idx_measurements_site_timestamp").on(table.site_id, table.timestamp),
  ],
);

export const idempotencyKeys = pgTable("idempotency_keys", {
  key: varchar("key", { length: 255 }).primaryKey(),
  response: jsonb("response").notNull(),
  status_code: integer("status_code").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event_type: varchar("event_type", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    processed: integer("processed").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processed_at: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_outbox_unprocessed").on(table.processed, table.created_at),
  ],
);

export const sitesRelations = relations(sites, ({ many }) => ({
  measurements: many(measurements),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  site: one(sites, {
    fields: [measurements.site_id],
    references: [sites.id],
  }),
}));
