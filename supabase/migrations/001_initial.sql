-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table admins (
  id uuid default gen_random_uuid() primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz default now()
);

create table rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  created_at timestamptz default now()
);

create table teachers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  username text not null unique,
  password_hash text not null,
  room_id uuid references rooms(id) on delete set null,
  active boolean default true,
  created_at timestamptz default now()
);

create table students (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  gender text not null check (gender in ('male', 'female')),
  pin_hash text not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table checkouts (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references students(id) not null,
  room_id uuid references rooms(id) not null,
  teacher_id uuid references teachers(id) not null,
  location text not null,
  check_out_time timestamptz not null default now(),
  check_in_time timestamptz,
  duration_minutes integer,
  is_checked_out boolean default true,
  created_at timestamptz default now()
);

create table settings (
  key text primary key,
  value text not null,
  label text not null,
  description text
);

create table sessions (
  id uuid default gen_random_uuid() primary key,
  token text unique not null default gen_random_uuid()::text,
  user_type text check (user_type in ('admin', 'teacher')) not null,
  user_id text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ============================================================
-- DEFAULT SETTINGS
-- ============================================================

insert into settings (key, value, label, description) values
  ('page_title', 'Classroom Check-In/Out Tracker', 'Page Title', 'The title shown at the top of the main page'),
  ('girls_section_title', 'Girls', 'Girls Section Title', 'Title for the girls checkout section'),
  ('boys_section_title', 'Boys', 'Boys Section Title', 'Title for the boys checkout section'),
  ('max_bathroom_per_room_boys', '1', 'Max Boys Per Room (Bathroom)', 'Max boys from one classroom in bathroom at once'),
  ('max_bathroom_per_room_girls', '1', 'Max Girls Per Room (Bathroom)', 'Max girls from one classroom in bathroom at once'),
  ('max_bathroom_total_boys', '2', 'Max Boys Total (Bathroom)', 'Max boys school-wide in bathroom at once'),
  ('max_bathroom_total_girls', '2', 'Max Girls Total (Bathroom)', 'Max girls school-wide in bathroom at once'),
  ('time_limit_minutes', '10', 'Daily Bathroom Time Limit (minutes)', 'Max minutes a student can spend in the bathroom per day'),
  ('locations', 'Bathroom,Office,Nurse', 'Available Locations', 'Comma-separated list of checkout locations');

-- ============================================================
-- DEFAULT ROOMS & TEACHERS
-- (Passwords will need to be set via the /setup page)
-- ============================================================

insert into rooms (name) values
  ('Nelson'),
  ('Hernandez'),
  ('Walls'),
  ('Shoemaker'),
  ('Bailey'),
  ('Lopez'),
  ('Rivera'),
  ('Swaggart');

-- ============================================================
-- DEFAULT STUDENTS (PINs from original app - must be re-hashed)
-- Run the seed script after setup to import with hashed PINs
-- ============================================================

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table admins enable row level security;
alter table rooms enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table checkouts enable row level security;
alter table settings enable row level security;
alter table sessions enable row level security;

-- Public read access (needed for the main page)
create policy "public_read_rooms" on rooms for select using (true);
create policy "public_read_teachers" on teachers for select using (active = true);
create policy "public_read_students" on students for select using (active = true);
create policy "public_read_checkouts" on checkouts for select using (true);
create policy "public_read_settings" on settings for select using (true);

-- Service role (used by API routes) bypasses RLS automatically

-- ============================================================
-- INDEXES for performance
-- ============================================================

create index idx_checkouts_is_checked_out on checkouts(is_checked_out);
create index idx_checkouts_student_id on checkouts(student_id);
create index idx_checkouts_teacher_id on checkouts(teacher_id);
create index idx_checkouts_check_out_time on checkouts(check_out_time);
create index idx_sessions_token on sessions(token);
create index idx_sessions_expires_at on sessions(expires_at);

-- ============================================================
-- AUTO-CLEANUP old sessions (optional, run periodically)
-- ============================================================
-- delete from sessions where expires_at < now();
