-- FirmOS live app tables (document-per-row; text ids matching the app's domain model).
-- Accessed server-side with the service-role key only; RLS enabled with no
-- policies so anon/publishable keys cannot read anything.
-- 0001_init.sql remains the normative relational schema for the full
-- Supabase-Auth-backed rollout (PRD §8); these tables power the running app now.

create table if not exists app_firm (
  id text primary key default 'firm',
  data jsonb not null,
  updated_at timestamptz default now()
);

do $$
declare t text;
begin
  -- Note: 'app_logins' (not app_users) — 0001 already owns the relational app_users table.
  foreach t in array array[
    'app_logins','app_courts','app_clients','app_cases','app_hearings',
    'app_documents','app_fees','app_inquiries','app_notifications','app_audit'
  ] loop
    execute format(
      'create table if not exists %I (id text primary key, data jsonb not null, updated_at timestamptz default now())', t);
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

alter table app_firm enable row level security;

create index if not exists app_cases_data_idx on app_cases using gin (data);
create index if not exists app_hearings_date_idx on app_hearings ((data->>'date'));
create index if not exists app_audit_at_idx on app_audit ((data->>'at'));
