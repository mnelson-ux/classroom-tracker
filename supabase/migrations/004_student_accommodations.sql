-- ============================================================
-- STUDENT ACCOMMODATIONS (IEP / 504)
-- Per-student override of the daily bathroom time limit (in minutes).
-- NULL = use the school's default (settings.time_limit_minutes).
-- ============================================================

alter table students add column if not exists bathroom_limit_minutes integer;
