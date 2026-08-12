-- ============================================================
-- 010: PASS QUEUE, NURSE HEALTH FORM, PROTECTED TIME
-- ============================================================

-- 1. QUEUE ---------------------------------------------------
-- A waiting line for Bathroom (per gender) and Nurse when they're at capacity.
-- Rows only exist while a student is waiting; they're deleted when the student
-- gets to go (a successful checkout) or cancels.
create table if not exists pass_queue (
  id uuid default gen_random_uuid() primary key,
  school text not null default 'hs',
  student_id uuid references students(id) on delete cascade not null,
  teacher_id uuid references teachers(id) on delete set null,
  location text not null,          -- 'Bathroom' | 'Nurse'
  gender text,                     -- copied from student, for gendered bathroom lines
  created_at timestamptz not null default now()
);
create index if not exists idx_pass_queue_lookup on pass_queue(school, location, created_at);
create index if not exists idx_pass_queue_student on pass_queue(student_id);

alter table pass_queue enable row level security;
drop policy if exists "public_read_queue" on pass_queue;
create policy "public_read_queue" on pass_queue for select using (true);

-- 2. NURSE HEALTH FORM --------------------------------------
-- Filled out when a student checks out to the Nurse, shown on their pass.
alter table checkouts add column if not exists health_symptoms text;   -- comma-separated list
alter table checkouts add column if not exists health_note text;       -- the "Other" free text
alter table checkouts add column if not exists health_initials text;   -- approving teacher's initials

-- 3. PROTECTED TIME -----------------------------------------
-- Daily windows during which students may not self-check-out (teachers can still
-- issue passes). Times are minutes from midnight in the school's timezone.
create table if not exists protected_times (
  id uuid default gen_random_uuid() primary key,
  school text not null default 'hs',
  label text,
  start_minute integer not null,
  end_minute integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_protected_times_school on protected_times(school);

alter table protected_times enable row level security;
drop policy if exists "public_read_protected" on protected_times;
create policy "public_read_protected" on protected_times for select using (true);

-- 4. NEW SETTINGS (per school) ------------------------------
insert into settings (key, value, label, description, school)
select v.key, v.value, v.label, v.description, s.school
from (values
  ('nurse_capacity', '2', 'Max Students at Nurse', 'How many students can be at the nurse at once before others must wait in the queue'),
  ('queue_max', '5', 'Max Students in Queue', 'How many students can wait in a bathroom/nurse line at once'),
  ('timezone', 'America/New_York', 'School Timezone', 'IANA timezone used for protected-time windows (e.g. America/New_York, America/Chicago)')
) as v(key, value, label, description)
cross join (select distinct school from settings) as s
on conflict (key, school) do nothing;

-- 5. REALTIME -----------------------------------------------
-- Let the kiosk/board get live queue updates (polling is the fallback).
do $$ begin
  alter publication supabase_realtime add table pass_queue;
exception when others then null;
end $$;

