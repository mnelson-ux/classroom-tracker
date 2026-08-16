-- ============================================================
-- 012: AUTH THROTTLE (brute-force protection)
-- Tracks failed login / PIN attempts per identity and locks that
-- identity for a cooldown after too many failures. Server-only:
-- read/written exclusively by the service role, never exposed to anon.
-- ============================================================

create table if not exists auth_throttle (
  key text primary key,               -- e.g. 'login:admin:jsmith' or 'pin:<studentId>'
  fail_count integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table auth_throttle enable row level security;
-- No anon/authenticated policy on purpose — only the service role touches this.
grant all on table auth_throttle to service_role;
