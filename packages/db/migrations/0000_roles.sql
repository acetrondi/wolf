-- 0000: roles — security foundation
-- app_owner: migrations + withSystem (BYPASSRLS)
-- app_user: application path (NO bypass — subject to FORCE RLS)

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_owner') then
    create role app_owner nologin bypassrls;
  else
    alter role app_owner with bypassrls;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin nobypassrls;
  else
    alter role app_user with nobypassrls;
  end if;
end $$;

-- Allow the Neon login role to assume these roles inside transactions
do $$
declare
  login_role text := session_user;
begin
  execute format('grant app_owner to %I', login_role);
  execute format('grant app_user to %I', login_role);
end $$;
