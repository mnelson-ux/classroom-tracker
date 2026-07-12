-- ============================================================
-- STAFF FEEDBACK — issue reports & change requests
-- Submitted by teachers/admins in Teacher Tools, reviewed in the admin panel.
-- ============================================================

create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  type text not null default 'issue',            -- 'issue' | 'request'
  message text not null,
  submitted_by text,                             -- staff name for display
  teacher_id uuid references teachers(id) on delete set null,
  school text,
  status text not null default 'open',           -- 'open' | 'resolved'
  created_at timestamptz default now()
);

alter table feedback enable row level security;
create index if not exists idx_feedback_status on feedback(status);
create index if not exists idx_feedback_created on feedback(created_at);
