-- ============================================================
-- 014: AUDIT LOG (access & change trail for student data)
-- Records WHO did WHAT and WHEN — logins, student/teacher/settings
-- changes, data exports, and destructive resets. Lives in your own
-- database, so it is retained for as long as you keep it (no platform
-- log-retention limit applies). Server-only table.
-- ============================================================

create table if not exists audit_log (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default now(),
  actor_type text,              -- admin | teacher | student | system
  actor_id text,
  actor_name text,              -- denormalized so it stays readable if the user is later removed
  action text not null,         -- e.g. login, student.update, history.export
  entity text,                  -- student | teacher | settings | checkouts | ...
  entity_id text,
  detail text,                  -- short human-readable summary
  school text,
  ip text
);
create index if not exists idx_audit_created on audit_log(created_at desc);
create index if not exists idx_audit_action on audit_log(action);
create index if not exists idx_audit_actor on audit_log(actor_id);

alter table audit_log enable row level security;
-- Server-only: written and read via service-role API routes; never exposed to anon.
grant all on table audit_log to service_role;
