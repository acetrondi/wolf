-- 0002: core schema (identity, brand, content, ops)
-- Forward-only. Drop smoke-test "users" table from Phase 0 drizzle push.

drop table if exists users cascade;

create type org_role as enum ('owner', 'admin', 'editor', 'viewer');
create type plan_status as enum ('draft', 'generating', 'ready', 'archived');
create type item_status as enum (
  'idea', 'planned', 'generating', 'needs_review', 'approved', 'scheduled', 'published', 'skipped'
);
create type variant_status as enum (
  'pending', 'generating', 'draft', 'needs_review', 'approved', 'scheduled', 'published', 'failed'
);
create type version_source as enum ('ai', 'human', 'import');

create table user_account (
  id uuid primary key default gen_random_uuid(),
  external_auth_id text not null unique,
  email citext not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table org (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  plan text not null default 'free',
  is_personal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table org_member (
  org_id uuid not null references org (id) on delete cascade,
  user_id uuid not null references user_account (id) on delete cascade,
  role org_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_member_user_id_idx on org_member (user_id);

create table brand (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  name text not null,
  slug citext not null,
  website text,
  description text,
  audience text,
  offer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (org_id, slug)
);
create index brand_org_id_idx on brand (org_id);
create index brand_org_active_idx on brand (org_id) where deleted_at is null;

create table brand_voice (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  brand_id uuid not null references brand (id) on delete cascade,
  version integer not null,
  is_active boolean not null default false,
  spec jsonb not null,
  compiled_card text not null,
  card_hash text not null,
  created_by uuid references user_account (id),
  created_at timestamptz not null default now(),
  unique (brand_id, version)
);
create unique index brand_voice_one_active on brand_voice (brand_id) where is_active;
create index brand_voice_org_id_idx on brand_voice (org_id);

create table brand_voice_sample (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  brand_id uuid not null references brand (id) on delete cascade,
  label text not null check (label in ('good', 'bad')),
  source_url text,
  body text not null,
  notes text,
  created_at timestamptz not null default now()
);
create index brand_voice_sample_org_id_idx on brand_voice_sample (org_id);

create table platform (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  config jsonb not null,
  config_version integer not null default 1,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table brand_platform_profile (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  brand_id uuid not null references brand (id) on delete cascade,
  platform_id uuid not null references platform (id) on delete restrict,
  handle text,
  target_context jsonb not null default '{}'::jsonb,
  cadence jsonb not null default '{}'::jsonb,
  voice_overrides jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, platform_id)
);
create index brand_platform_profile_org_id_idx on brand_platform_profile (org_id);

create table content_plan (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  brand_id uuid not null references brand (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status plan_status not null default 'draft',
  strategy jsonb not null default '{}'::jsonb,
  created_by uuid references user_account (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, period_start)
);
create index content_plan_org_id_idx on content_plan (org_id);

create table content_item (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  plan_id uuid not null references content_plan (id) on delete cascade,
  brand_id uuid not null references brand (id) on delete cascade,
  position integer not null,
  pillar text,
  working_title text not null,
  thesis text not null,
  evidence jsonb not null default '[]'::jsonb,
  status item_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index content_item_org_plan_pos_idx on content_item (org_id, plan_id, position);

create table content_variant (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  item_id uuid not null references content_item (id) on delete cascade,
  platform_id uuid not null references platform (id) on delete restrict,
  target_key text,
  status variant_status not null default 'pending',
  current_version_id uuid,
  scheduled_at timestamptz,
  published_at timestamptz,
  external_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, platform_id, target_key)
);
create index content_variant_org_status_sched_idx on content_variant (org_id, status, scheduled_at);

create table content_version (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  variant_id uuid not null references content_variant (id) on delete cascade,
  version_no integer not null,
  source version_source not null,
  body_doc jsonb not null,
  body_md text not null,
  title text not null,
  subtitle text,
  tags text[] not null default '{}',
  lint_report jsonb not null default '{}'::jsonb,
  voice_card_hash text,
  generation_run_id uuid,
  created_by uuid references user_account (id),
  created_at timestamptz not null default now(),
  unique (variant_id, version_no)
);
create index content_version_org_variant_idx on content_version (org_id, variant_id);

alter table content_variant
  add constraint content_variant_current_version_fk
  foreign key (current_version_id) references content_version (id) on delete set null;

create table content_asset (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  brand_id uuid not null references brand (id) on delete cascade,
  storage_key text not null,
  mime_type text not null,
  bytes bigint not null,
  width integer,
  height integer,
  alt_text text,
  created_at timestamptz not null default now()
);
create index content_asset_org_id_idx on content_asset (org_id);

create table integration_account (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  provider text not null,
  external_id text not null,
  access_token_enc bytea,
  refresh_token_enc bytea,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  sync_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, provider, external_id)
);
create index integration_account_org_id_idx on integration_account (org_id);

create table calendar_event (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  variant_id uuid not null references content_variant (id) on delete cascade,
  integration_id uuid not null references integration_account (id) on delete cascade,
  external_calendar_id text not null,
  external_event_id text not null,
  etag text,
  last_synced_at timestamptz,
  sync_state text not null default 'synced',
  unique (integration_id, external_event_id)
);
create index calendar_event_org_id_idx on calendar_event (org_id);

create table generation_run (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  kind text not null,
  subject_type text not null,
  subject_id uuid not null,
  provider text,
  model text,
  prompt_version text not null,
  voice_card_hash text,
  input_tokens int,
  output_tokens int,
  cost_micros bigint not null default 0,
  latency_ms int,
  status text not null,
  error jsonb,
  created_at timestamptz not null default now()
);
create index generation_run_org_created_idx on generation_run (org_id, created_at desc);

create table job_outbox (
  id bigserial primary key,
  org_id uuid not null,
  job_name text not null,
  payload jsonb not null,
  idempotency_key text not null unique,
  state text not null default 'pending',
  attempts int not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index job_outbox_state_available_idx on job_outbox (state, available_at);
create index job_outbox_org_id_idx on job_outbox (org_id);

create table audit_log (
  id bigserial primary key,
  org_id uuid,
  actor_id uuid,
  actor_type text not null default 'user',
  action text not null,
  subject_type text,
  subject_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_org_created_idx on audit_log (org_id, created_at desc);
