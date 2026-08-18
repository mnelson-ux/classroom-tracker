-- ============================================================
-- 015: ANONYMOUS NURSE VISITS
-- Nurse passes and the nurse waiting line, with NO link to any student.
-- Each entry is identified only by a random token the student's device holds.
-- Never joins to students/checkouts, so it never appears in reports/history.
-- No symptoms, no names — anonymous by construction.
-- ============================================================

create table if not exists nurse_visits (
  id uuid default gen_random_uuid() primary key,
  token text not null,                     -- random secret held by the requesting device
  school text not null default 'hs',
  status text not null default 'out',      -- 'out' (at the nurse) | 'waiting' (in line)
  created_at timestamptz not null default now()
);
create index if not exists idx_nurse_school_status on nurse_visits(school, status, created_at);
create index if not exists idx_nurse_token on nurse_visits(token);

alter table nurse_visits enable row level security;
-- Server-only: managed entirely through the service-role API. Never exposed to anon.
grant all on table nurse_visits to service_role;
