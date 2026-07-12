-- ============================================================
-- PRIVATE (NON-SHARED) BATHROOMS
-- Teachers flagged with a private bathroom manage their own capacity:
-- their bathroom trips don't count against the school-wide shared limit,
-- and the shared limit doesn't block them. The per-room limit still applies
-- (e.g. one student per gender in their own bathroom).
-- ============================================================

alter table teachers add column if not exists has_private_bathroom boolean not null default false;
