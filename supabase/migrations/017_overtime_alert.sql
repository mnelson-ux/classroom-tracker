-- ============================================================
-- 017: OVERTIME ALERT
-- Minutes a student can be out before their pass device starts sounding a tone
-- and flashing to remind them to check back in. 0 disables the alert.
-- ============================================================

insert into settings (key, value, label, description, school)
select 'overtime_alert_minutes', '15', 'Overtime Alert (minutes)',
       'Minutes out before the student''s pass sounds a tone and flashes to remind them to check back in (0 = off)',
       s.school
from (select distinct school from settings) as s
on conflict (key, school) do nothing;
