-- ============================================================
-- MULTI-SCHOOL SUPPORT
-- Adds a `school` dimension ('hs' = High School, 'ms' = Middle School)
-- to students, teachers, rooms, checkouts, and settings.
-- All existing data defaults to 'hs'; reassign in the admin panel as needed.
-- ============================================================

-- 1. Add school column to core tables (existing rows become 'hs')
alter table students  add column if not exists school text not null default 'hs';
alter table teachers  add column if not exists school text not null default 'hs';
alter table rooms     add column if not exists school text not null default 'hs';
alter table checkouts add column if not exists school text not null default 'hs';

-- 2. Rooms: name is unique per school, not globally
alter table rooms drop constraint if exists rooms_name_key;
create unique index if not exists rooms_name_school_key on rooms(name, school);

-- 3. Settings: make per-school. Change primary key from (key) to (key, school).
alter table settings add column if not exists school text not null default 'hs';
alter table settings drop constraint if exists settings_pkey;
alter table settings add primary key (key, school);

-- Give the Middle School its own copy of every setting (starts identical to HS).
insert into settings (key, value, label, description, school)
  select key, value, label, description, 'ms' from settings where school = 'hs'
  on conflict (key, school) do nothing;

-- 4. Backfill each checkout's school from its student
update checkouts c set school = s.school from students s where c.student_id = s.id;

-- 5. Indexes for the new filters
create index if not exists idx_students_school  on students(school);
create index if not exists idx_teachers_school  on teachers(school);
create index if not exists idx_rooms_school      on rooms(school);
create index if not exists idx_checkouts_school on checkouts(school);
