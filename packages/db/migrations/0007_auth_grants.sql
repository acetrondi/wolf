-- 0007: grants for auth tables created in 0006

grant select, insert, update, delete on table webhook_event to app_owner;
grant select, insert, update, delete on table org_invite to app_owner;
grant select, insert, update, delete on table org_invite to app_user;
