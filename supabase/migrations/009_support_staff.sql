-- ============================================================
-- SUPPORT STAFF
-- Staff who can log in and use the tools (issue passes, excuse, board)
-- but are NOT classroom teachers — so they don't appear in the student
-- "current teacher" dropdown or as teacher-to-teacher pass destinations.
-- ============================================================

alter table teachers add column if not exists is_support boolean not null default false;
