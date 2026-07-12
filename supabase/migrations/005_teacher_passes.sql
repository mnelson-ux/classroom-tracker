-- ============================================================
-- TEACHER PASSES & EXCUSES
-- Extends checkouts so teachers can issue passes and log excuses.
--   pass_type: 'student' (self check-out) | 'teacher_issued' | 'excuse'
--   issued_by: teacher who created a teacher_issued/excuse pass
--   destination_teacher_id: for teacher-to-teacher passes
--   reason: free-text note (custom destination, why kept after, etc.)
--   arrival_confirmed: receiving teacher confirmed the student arrived
-- ============================================================

alter table checkouts add column if not exists pass_type text not null default 'student';
alter table checkouts add column if not exists issued_by uuid references teachers(id) on delete set null;
alter table checkouts add column if not exists destination_teacher_id uuid references teachers(id) on delete set null;
alter table checkouts add column if not exists reason text;
alter table checkouts add column if not exists arrival_confirmed boolean not null default false;

create index if not exists idx_checkouts_pass_type on checkouts(pass_type);
create index if not exists idx_checkouts_issued_by on checkouts(issued_by);
