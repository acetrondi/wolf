-- 0004: RLS + FORCE RLS on every tenant table
-- Policies are single-column org_id equality (fast + hard to get wrong).

do $$
declare
  t text;
begin
  foreach t in array array[
    'org_member',
    'brand',
    'brand_voice',
    'brand_voice_sample',
    'brand_platform_profile',
    'content_plan',
    'content_item',
    'content_variant',
    'content_version',
    'content_asset',
    'integration_account',
    'calendar_event',
    'generation_run',
    'job_outbox',
    'audit_log'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy %I on %I for select using (org_id = app_current_org_id())',
      t || '_sel',
      t
    );
    execute format(
      'create policy %I on %I for insert with check (org_id = app_current_org_id())',
      t || '_ins',
      t
    );
    execute format(
      'create policy %I on %I for update using (org_id = app_current_org_id()) with check (org_id = app_current_org_id())',
      t || '_upd',
      t
    );
    execute format(
      'create policy %I on %I for delete using (org_id = app_current_org_id())',
      t || '_del',
      t
    );
  end loop;
end $$;

-- org is the tenant root: scoped by id = current org
alter table org enable row level security;
alter table org force row level security;
create policy org_sel on org for select using (id = app_current_org_id());
create policy org_ins on org for insert with check (id = app_current_org_id());
create policy org_upd on org for update using (id = app_current_org_id()) with check (id = app_current_org_id());
create policy org_del on org for delete using (id = app_current_org_id());

-- user_account: self only under app_user (bootstrap via withSystem)
alter table user_account enable row level security;
alter table user_account force row level security;
create policy user_account_sel on user_account
  for select using (id = app_current_user_id());
create policy user_account_upd on user_account
  for update using (id = app_current_user_id()) with check (id = app_current_user_id());
-- inserts happen via withSystem (app_owner bypass)

-- platform registry: global read-only for app_user
alter table platform enable row level security;
alter table platform force row level security;
create policy platform_sel on platform for select using (true);
-- no insert/update/delete policies for app_user → denied
