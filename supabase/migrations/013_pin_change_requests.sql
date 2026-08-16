-- ============================================================
-- 013: PIN CHANGE REQUESTS
-- A student asks to change their PIN from the kiosk (proving they know the
-- current one); their chosen teacher approves or denies it. The requested new
-- PIN is stored HASHED — the teacher never sees it. Server-only table.
-- ============================================================

create table if not exists pin_change_requests (
  id uuid default gen_random_uuid() primary key,
  school text not null default 'hs',
  student_id uuid references students(id) on delete cascade not null,
  teacher_id uuid references teachers(id) on delete cascade not null,
  new_pin_hash text not null,
  status text not null default 'pending',   -- pending | approved | denied
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references teachers(id) on delete set null
);
create index if not exists idx_pin_requests_teacher on pin_change_requests(teacher_id, status);
create index if not exists idx_pin_requests_school on pin_change_requests(school, status);

alter table pin_change_requests enable row level security;
-- Server-only: created via the kiosk API and resolved via the teacher API,
-- both using the service role. Never exposed to the anon key.
grant all on table pin_change_requests to service_role;
