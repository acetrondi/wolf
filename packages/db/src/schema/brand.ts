import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { org, userAccount } from "./identity";

export const brand = pgTable(
  "brand",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    website: text("website"),
    description: text("description"),
    audience: text("audience"),
    offer: text("offer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    unique("brand_org_slug_uidx").on(t.orgId, t.slug),
    index("brand_org_id_idx").on(t.orgId),
  ],
);

export const brandVoice = pgTable(
  "brand_voice",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    spec: jsonb("spec").notNull(),
    compiledCard: text("compiled_card").notNull(),
    cardHash: text("card_hash").notNull(),
    createdBy: uuid("created_by").references(() => userAccount.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("brand_voice_brand_version_uidx").on(t.brandId, t.version),
    uniqueIndex("brand_voice_one_active").on(t.brandId).where(sql`${t.isActive} = true`),
    index("brand_voice_org_id_idx").on(t.orgId),
  ],
);

export const brandVoiceSample = pgTable(
  "brand_voice_sample",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    sourceUrl: text("source_url"),
    body: text("body").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("brand_voice_sample_org_id_idx").on(t.orgId)],
);

export const platform = pgTable("platform", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  config: jsonb("config").notNull(),
  configVersion: integer("config_version").notNull().default(1),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const brandPlatformProfile = pgTable(
  "brand_platform_profile",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "restrict" }),
    handle: text("handle"),
    targetContext: jsonb("target_context").notNull().default({}),
    cadence: jsonb("cadence").notNull().default({}),
    voiceOverrides: jsonb("voice_overrides").notNull().default({}),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("brand_platform_profile_uidx").on(t.brandId, t.platformId),
    index("brand_platform_profile_org_id_idx").on(t.orgId),
  ],
);
