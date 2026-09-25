-- Track when an admin has opened a camp registration, separate from its
-- confirmed/waitlisted/cancelled workflow status (which is a real business
-- decision an admin makes on purpose, not something that should flip just
-- because a row was viewed).
alter table public.registrations add column if not exists opened_at timestamptz;
