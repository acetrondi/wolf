import { sql } from "drizzle-orm";
import {
  bigserial,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { org, orgRoleEnum, userAccount } from "./identity";

export const webhookEvent = pgTable("webhook_event", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  externalId: text("external_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orgInvite = pgTable(
  "org_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: orgRoleEnum("role").notNull().default("editor"),
    token: text("token").notNull().unique(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => userAccount.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: uuid("accepted_by").references(() => userAccount.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("org_invite_org_id_idx").on(t.orgId),
    uniqueIndex("org_invite_pending_uidx")
      .on(t.orgId, t.email)
      .where(sql`accepted_at is null`),
  ],
);
