-- Job queue for heavy-compute workers (PRD §4.3 Oracle free-tier variant).
-- Producers: the app (service role). Consumers: worker VMs (service role).
-- RLS enabled with no policies — anon/publishable keys see nothing.

create table if not exists app_jobs (
  id text primary key,
  kind text not null check (kind in ('ping','ocr','pdf')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','claimed','done','failed')),
  result jsonb,
  error text,
  attempts int not null default 0,
  claimed_by text,
  created_at timestamptz default now(),
  claimed_at timestamptz,
  finished_at timestamptz
);
alter table app_jobs enable row level security;
create index if not exists app_jobs_queue_idx on app_jobs (status, created_at) where status = 'queued';

-- Atomic claim: worker takes the oldest queued job of the kinds it supports.
create or replace function claim_job(worker_id text, kinds text[])
returns setof app_jobs
language sql
security definer
as $$
  update app_jobs
     set status = 'claimed', claimed_by = worker_id,
         claimed_at = now(), attempts = attempts + 1
   where id = (
     select id from app_jobs
      where status = 'queued' and kind = any(kinds)
      order by created_at
      limit 1
      for update skip locked
   )
  returning *;
$$;

revoke all on function claim_job(text, text[]) from public, anon, authenticated;
