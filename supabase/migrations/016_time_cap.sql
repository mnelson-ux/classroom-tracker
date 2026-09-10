-- ============================================================
-- 016: FORGOTTEN CHECK-IN HANDLING
-- Caps the recorded time of a self-checkout pass so a forgotten check-in can't
-- log an absurd duration, and flags any pass whose time was capped or corrected.
-- ============================================================

alter table checkouts add column if not exists capped boolean not null default false;

-- Per-school setting: max minutes a student pass may record (forgotten passes cap here).
insert into settings (key, value, label, description, school)
select 'max_recorded_minutes', '20', 'Max Recorded Minutes',
       'A student pass longer than this is treated as a forgotten check-in and capped to this many minutes',
       s.school
from (select distinct school from settings) as s
on conflict (key, school) do nothing;
