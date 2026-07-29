-- 0006: auth & tenancy (webhook dedupe, invites, soft-delete users)

alter table user_account add column if not exists deleted_at timestamptz;

create table if not exists webhook_event (
  id bigserial primary key,
  external_id text not null unique,
  event_type text not null,
  received_at timestamptz not null default now()
);

create table if not exists org_invite (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references org (id) on delete cascade,
  email citext not null,
  role org_role not null default 'editor',
  token text not null unique,
  invited_by uuid not null references user_account (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references user_account (id),
  created_at timestamptz not null default now()
);
create index if not exists org_invite_org_id_idx on org_invite (org_id);
create unique index if not exists org_invite_pending_uidx
  on org_invite (org_id, email) where accepted_at is null;

alter table org_invite enable row level security;
alter table org_invite force row level security;
create policy org_invite_sel on org_invite
  for select using (org_id = app_current_org_id());
create policy org_invite_ins on org_invite
  for insert with check (org_id = app_current_org_id());
create policy org_invite_upd on org_invite
  for update using (org_id = app_current_org_id())
  with check (org_id = app_current_org_id());
create policy org_invite_del on org_invite
  for delete using (org_id = app_current_org_id());

revoke insert, update, delete on table webhook_event from app_user;
grant select on table webhook_event to app_user;
