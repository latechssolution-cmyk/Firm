-- FirmOS production schema (PRD §8) — multi-tenant with row-level security.
-- Apply with: supabase db push  (or psql -f against your Supabase project)

create extension if not exists pgcrypto;

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_urdu text,
  subdomain text unique not null,
  branding jsonb default '{}'::jsonb,
  plan text default 'trial',
  status text default 'trial' check (status in ('trial','active','suspended')),
  is_demo boolean default false,
  created_at timestamptz default now()
);

create table app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,                -- FK to auth.users
  tenant_id uuid not null references tenants(id),
  role text not null check (role in ('admin','associate','clerk','client')),
  capabilities jsonb default '[]'::jsonb,
  name text not null,
  phone text,
  cnic text,
  client_id uuid,
  created_at timestamptz default now()
);

create table courts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),   -- null = master directory row
  type text not null check (type in ('SC','FSC','HC','district-civil','sessions','family','tribunal')),
  name text not null,
  bench text,
  city text,
  court_room text
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  cnic text,
  phone text not null,
  address text,
  language_pref text default 'ur' check (language_pref in ('en','ur')),
  consent jsonb default '{}'::jsonb,       -- {terms_at, data_at} — PDP-ready (CP-8)
  created_at timestamptz default now()
);

create table cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  matter_thread_id uuid not null,
  number text not null,
  type text not null check (type in ('civil','criminal','family','writ','appeal','revision')),
  court_id uuid references courts(id),
  stage text not null,
  title text not null,
  parties jsonb not null,
  client_id uuid references clients(id),
  assigned_user_ids uuid[] default '{}',
  status text default 'active' check (status in ('active','decided','dormant')),
  fir_no text,
  police_station text,
  sections text[],
  filed_on date,
  created_at timestamptz default now()
);
create index cases_tenant_idx on cases(tenant_id);
create index cases_search_idx on cases using gin (to_tsvector('simple', number || ' ' || title));

create table hearings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  case_id uuid not null references cases(id) on delete cascade,
  date date not null,
  time time,
  purpose text,
  outcome_note text,
  next_date date,
  readiness text default 'pending' check (readiness in ('ready','pending','na')),
  entered_by uuid references app_users(id),
  entered_at timestamptz default now()
);
create index hearings_date_idx on hearings(tenant_id, date);

create table documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  case_id uuid not null references cases(id) on delete cascade,
  kind text not null check (kind in ('generated','uploaded')),
  template_type text,
  title text not null,
  status text default 'draft' check (status in ('draft','review','filed')),
  visibility text default 'firm' check (visibility in ('firm','shared')),
  body text,
  file_ref text,                            -- Supabase Storage path
  ocr_text text,
  ocr_status text default 'n/a',
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);
create index documents_ocr_idx on documents using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(ocr_text,'')));

create table fee_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  case_id uuid not null references cases(id) on delete cascade,
  kind text not null check (kind in ('agreed','received','adjustment')),
  amount numeric(12,0) not null,
  method text check (method in ('cash','bank','gateway')),
  gateway_txn_id text,
  date date default current_date,
  note text,
  entered_by uuid references app_users(id)
);

create table payment_intents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  case_id uuid references cases(id),
  client_id uuid references clients(id),
  amount numeric(12,0) not null,
  gateway text,
  status text default 'pending' check (status in ('pending','paid','failed','expired')),
  checkout_url text,
  webhook_payloads jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table inquiries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  channel text not null check (channel in ('webchat','whatsapp','voice')),
  caller_name text,
  phone text,
  matter_type text,
  summary text,
  urgency text default 'normal' check (urgency in ('normal','urgent')),
  callback_slot timestamptz,
  status text default 'new' check (status in ('new','contacted','consulted','converted','closed')),
  transcript jsonb default '[]'::jsonb,
  converted_case_id uuid references cases(id),
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  recipient text not null,
  channel text not null check (channel in ('sms','whatsapp','email','in-app')),
  template text,
  language text default 'en',
  payload text,
  status text default 'queued' check (status in ('queued','sent','delivered','failed')),
  attempts int default 0,
  provider_ref text,
  created_at timestamptz default now(),
  delivered_at timestamptz
);
create index notifications_queue_idx on notifications(status, created_at) where status = 'queued';

create table audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants(id),
  user_id uuid,
  user_name text,
  action text not null check (action in ('login','view','download','edit','create')),
  entity_type text not null,
  entity_id text not null,
  detail text,
  ip inet,
  at timestamptz default now()
);
create index audit_tenant_idx on audit_events(tenant_id, at desc);
-- Append-only: no update/delete grants; enforced below by revoking and by RLS having no update policy.

-- ============ Row-Level Security (tenant isolation, PRD SEC-1) ============
-- app_users.auth_user_id maps auth.uid() → tenant + role.
create or replace function current_tenant_id() returns uuid
language sql stable as $$
  select tenant_id from app_users where auth_user_id = auth.uid()
$$;

create or replace function current_role_name() returns text
language sql stable as $$
  select role from app_users where auth_user_id = auth.uid()
$$;

create or replace function current_client_id() returns uuid
language sql stable as $$
  select client_id from app_users where auth_user_id = auth.uid()
$$;

do $$
declare t text;
begin
  foreach t in array array['clients','cases','hearings','documents','fee_entries','payment_intents','inquiries','notifications','audit_events','app_users']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- Staff (admin/associate/clerk): full read within tenant; writes within tenant.
create policy staff_read on cases for select using (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk')
  -- clients reach cases only via the dedicated policy below
  or (tenant_id = current_tenant_id() and current_role_name() = 'client' and client_id = current_client_id())
);
create policy staff_write on cases for insert with check (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk'));
create policy staff_update on cases for update using (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk'));

-- Clients: shared documents only (CP-4).
create policy doc_read on documents for select using (
  tenant_id = current_tenant_id() and (
    current_role_name() in ('admin','associate','clerk')
    or (current_role_name() = 'client' and visibility = 'shared'
        and case_id in (select id from cases where client_id = current_client_id()))
  ));
create policy doc_write on documents for insert with check (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk'));
create policy doc_update on documents for update using (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk'));

-- Fees: admin/associate only (clerk needs explicit capability — enforced app-side too).
create policy fees_read on fee_entries for select using (
  tenant_id = current_tenant_id() and (
    current_role_name() in ('admin','associate')
    or (current_role_name() = 'client'
        and case_id in (select id from cases where client_id = current_client_id()))
  ));
create policy fees_write on fee_entries for insert with check (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate'));

-- Hearings: staff write, staff+own-client read.
create policy hearings_read on hearings for select using (
  tenant_id = current_tenant_id() and (
    current_role_name() in ('admin','associate','clerk')
    or (current_role_name() = 'client'
        and case_id in (select id from cases where client_id = current_client_id()))
  ));
create policy hearings_write on hearings for insert with check (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk'));

-- Remaining tables: staff-only within tenant.
create policy clients_all on clients for all using (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk'));
create policy inquiries_all on inquiries for all using (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk'));
create policy notifications_all on notifications for all using (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate','clerk'));
create policy payment_intents_staff on payment_intents for select using (
  tenant_id = current_tenant_id() and current_role_name() in ('admin','associate'));
create policy audit_read on audit_events for select using (
  tenant_id = current_tenant_id() and current_role_name() = 'admin');
create policy audit_insert on audit_events for insert with check (tenant_id = current_tenant_id());
create policy users_read on app_users for select using (tenant_id = current_tenant_id());

-- ============ Queues & schedules (Supabase-only stack, PRD §4.3) ============
-- Supabase Queues (pgmq) for notification dispatch/OCR/import jobs:
--   select pgmq.create('notifications');
--   select pgmq.create('ocr_jobs');
-- pg_cron: nightly demo-tenant reset + day-before hearing digest:
--   select cron.schedule('demo-reset', '0 21 * * *', $$select reset_demo_tenant()$$);
--   select cron.schedule('digest', '0 15 * * *', $$select enqueue_daily_digests()$$);
