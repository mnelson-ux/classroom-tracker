-- ============================================================
-- 011: KEEP-APART PAIRS
-- Prevents two specific students from being checked out at the same time
-- (e.g. to stop coordinated bathroom meet-ups). If either student in a pair
-- is currently out, the other is blocked from self-checking-out.
-- ============================================================

create table if not exists keep_apart (
  id uuid default gen_random_uuid() primary key,
  school text not null default 'hs',
  student_a uuid references students(id) on delete cascade not null,
  student_b uuid references students(id) on delete cascade not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_keep_apart_school on keep_apart(school);
create index if not exists idx_keep_apart_a on keep_apart(student_a);
create index if not exists idx_keep_apart_b on keep_apart(student_b);

alter table keep_apart enable row level security;
drop policy if exists "public_read_keep_apart" on keep_apart;
-- Server-only: read/written via the service-role API routes; never exposed to anon.
grant all on table keep_apart to service_role;
