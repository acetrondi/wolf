-- 0005: grants — app_user can DML, never DDL, never owns tables

grant usage on schema public to app_user, app_owner;

grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;

grant select, insert, update, delete on all tables in schema public to app_owner;
grant usage, select on all sequences in schema public to app_owner;

alter default privileges in schema public
  grant select, insert, update, delete on tables to app_user;
alter default privileges in schema public
  grant usage, select on sequences to app_user;

-- platform is read-only for the app role
revoke insert, update, delete on table platform from app_user;
grant select on table platform to app_user;
