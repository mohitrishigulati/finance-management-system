-- Runtime app connects as app_user (non-superuser), so RLS is enforced.
-- Table-level grants are still required alongside RLS row policies.
grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
alter default privileges in schema public grant select, insert, update, delete on tables to app_user;
