-- ============================================================
-- ADMIN-ISSUED PASSES
-- Admins aren't teachers, so a pass they issue has no origin classroom.
-- Allow checkouts.teacher_id to be null (office/admin-issued passes).
-- ============================================================

alter table checkouts alter column teacher_id drop not null;
