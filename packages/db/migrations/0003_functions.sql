-- 0003: tenant GUC helpers (no vendor auth helpers)

create or replace function app_current_org_id() returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_org_id', true), '')::uuid
$$;

create or replace function app_current_user_id() returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

revoke all on function app_current_org_id() from public;
revoke all on function app_current_user_id() from public;
grant execute on function app_current_org_id() to app_user, app_owner;
grant execute on function app_current_user_id() to app_user, app_owner;
