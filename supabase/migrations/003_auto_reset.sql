-- ============================================================
-- AUTOMATIC YEAR-END RESET SETTINGS (per school)
-- auto_reset_enabled  : 'true' | 'false'
-- auto_reset_date      : YYYY-MM-DD (only month/day are used; repeats yearly)
-- auto_reset_last_year : internal — the year the auto-reset last ran
-- ============================================================

insert into settings (key, value, label, description, school)
select v.key, v.value, v.label, v.description, s.school
from (values
  ('auto_reset_enabled', 'false', 'Automatic Year-End Reset', 'Automatically delete all checkout history once per year'),
  ('auto_reset_date', '2026-06-15', 'Year-End Reset Date', 'Month/day the yearly reset runs (year is ignored)'),
  ('auto_reset_last_year', '2000', 'Auto-Reset Last Year', 'Internal tracking — do not edit')
) as v(key, value, label, description)
cross join (select distinct school from settings) as s
on conflict (key, school) do nothing;
