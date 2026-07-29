import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { brand, platform } from "./brand";
import { org, userAccount } from "./identity";

export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "generating",
  "ready",
  "archived",
]);
export const itemStatusEnum = pgEnum("item_status", [
  "idea",
  "planned",
  "generating",
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "skipped",
]);
export const variantStatusEnum = pgEnum("variant_status", [
  "pending",
  "generating",
  "draft",
  "needs_review",
  "approved",
  "scheduled",
  "published",
  "failed",
]);
export const versionSourceEnum = pgEnum("version_source", ["ai", "human", "import"]);

export const contentPlan = pgTable(
  "content_plan",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "cascade" }),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: planStatusEnum("status").notNull().default("draft"),
    strategy: jsonb("strategy").notNull().default({}),
    createdBy: uuid("created_by").references(() => userAccount.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("content_plan_brand_period_uidx").on(t.brandId, t.periodStart),
    index("content_plan_org_id_idx").on(t.orgId),
  ],
);

export const contentItem = pgTable(
  "content_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => contentPlan.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    pillar: text("pillar"),
    workingTitle: text("working_title").notNull(),
    thesis: text("thesis").notNull(),
    evidence: jsonb("evidence").notNull().default([]),
    status: itemStatusEnum("status").notNull().default("planned"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("content_item_org_plan_pos_idx").on(t.orgId, t.planId, t.position)],
);

export const contentVariant = pgTable(
  "content_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => contentItem.id, { onDelete: "cascade" }),
    platformId: uuid("platform_id")
      .notNull()
      .references(() => platform.id, { onDelete: "restrict" }),
    targetKey: text("target_key"),
    status: variantStatusEnum("status").notNull().default("pending"),
    currentVersionId: uuid("current_version_id"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    externalUrl: text("external_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("content_variant_target_uidx").on(t.itemId, t.platformId, t.targetKey),
    index("content_variant_org_status_sched_idx").on(t.orgId, t.status, t.scheduledAt),
  ],
);

export const contentVersion = pgTable(
  "content_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => contentVariant.id, { onDelete: "cascade" }),
    versionNo: integer("version_no").notNull(),
    source: versionSourceEnum("source").notNull(),
    bodyDoc: jsonb("body_doc").notNull(),
    bodyMd: text("body_md").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    tags: text("tags").array().notNull().default([]),
    lintReport: jsonb("lint_report").notNull().default({}),
    voiceCardHash: text("voice_card_hash"),
    generationRunId: uuid("generation_run_id"),
    createdBy: uuid("created_by").references(() => userAccount.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("content_version_variant_no_uidx").on(t.variantId, t.versionNo),
    index("content_version_org_variant_idx").on(t.orgId, t.variantId),
  ],
);

export const contentAsset = pgTable(
  "content_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    brandId: uuid("brand_id")
      .notNull()
      .references(() => brand.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    bytes: integer("bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    altText: text("alt_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("content_asset_org_id_idx").on(t.orgId)],
);
