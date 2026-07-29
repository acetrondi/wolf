import {
  bigint,
  bigserial,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { contentVariant } from "./content";
import { org } from "./identity";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const integrationAccount = pgTable(
  "integration_account",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    accessTokenEnc: bytea("access_token_enc"),
    refreshTokenEnc: bytea("refresh_token_enc"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes").array().notNull().default([]),
    syncState: jsonb("sync_state").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("integration_account_uidx").on(t.orgId, t.provider, t.externalId),
    index("integration_account_org_id_idx").on(t.orgId),
  ],
);

export const calendarEvent = pgTable(
  "calendar_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => contentVariant.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrationAccount.id, { onDelete: "cascade" }),
    externalCalendarId: text("external_calendar_id").notNull(),
    externalEventId: text("external_event_id").notNull(),
    etag: text("etag"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncState: text("sync_state").notNull().default("synced"),
  },
  (t) => [
    unique("calendar_event_uidx").on(t.integrationId, t.externalEventId),
    index("calendar_event_org_id_idx").on(t.orgId),
  ],
);

export const generationRun = pgTable(
  "generation_run",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    provider: text("provider"),
    model: text("model"),
    promptVersion: text("prompt_version").notNull(),
    voiceCardHash: text("voice_card_hash"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costMicros: bigint("cost_micros", { mode: "number" }).notNull().default(0),
    latencyMs: integer("latency_ms"),
    status: text("status").notNull(),
    error: jsonb("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("generation_run_org_created_idx").on(t.orgId, t.createdAt)],
);

export const jobOutbox = pgTable(
  "job_outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orgId: uuid("org_id").notNull(),
    jobName: text("job_name").notNull(),
    payload: jsonb("payload").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    state: text("state").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("job_outbox_state_available_idx").on(t.state, t.availableAt),
    index("job_outbox_org_id_idx").on(t.orgId),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    orgId: uuid("org_id"),
    actorId: uuid("actor_id"),
    actorType: text("actor_type").notNull().default("user"),
    action: text("action").notNull(),
    subjectType: text("subject_type"),
    subjectId: uuid("subject_id"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_org_created_idx").on(t.orgId, t.createdAt)],
);
