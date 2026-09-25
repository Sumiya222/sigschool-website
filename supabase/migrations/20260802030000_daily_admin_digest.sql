-- Daily admin digest: replaces per-submission admin notification emails
-- (inquiries/registrations/job applications) with one batched email per day,
-- plus a small amount of state so the batch window and the two "urgent,
-- don't wait for the digest" alerts each fire at most once per real event.

-- singleton = true — same pattern as camp_window/company_settings.
-- last_sent_at is the watermark: each digest run covers
-- (last_sent_at, run_start] and advances it to run_start regardless of
-- whether anything was found, so a skipped or delayed run never causes a
-- gap or a double-count on the next one.
-- capacity_alert_camp records which camp_name has already received the
-- "near capacity" urgent alert, so it fires once per camp rather than once
-- per registration after the threshold is crossed.
CREATE TABLE public.digest_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  capacity_alert_camp text,
  CONSTRAINT digest_state_singleton_key UNIQUE (singleton),
  CONSTRAINT digest_state_singleton_true CHECK (singleton = true)
);
INSERT INTO public.digest_state (last_sent_at) VALUES (now());

-- Service-role only: this is internal bookkeeping for the digest job, never
-- read or written by anon/authenticated clients directly.
ALTER TABLE public.digest_state ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.digest_state TO service_role;

-- pg_cron + pg_net: pg_cron runs the schedule inside Postgres; since Postgres
-- itself can't send HTTP requests, pg_net's net.http_post() is what actually
-- reaches the app's /api/send-digest endpoint once a day.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- REQUIRES A ONE-TIME MANUAL STEP before this job can authenticate:
--   SELECT vault.create_secret('<the real value>', 'digest_cron_secret', 'Shared secret pg_cron sends as x-digest-secret to authenticate calls to /api/send-digest.');
-- Run once, directly against the database (SQL editor or psql) — never
-- committed to a migration, since that would put the live secret in git
-- history exactly like the literal this replaced. Must match the app's own
-- DIGEST_CRON_SECRET env var. If the secret is ever rotated, update both
-- places together (this vault entry and the app's env var).
--
-- 03:00 UTC = 08:00 PKT (Rawalpindi) — start of business, covering
-- everything since the previous run.
SELECT cron.schedule(
  'daily-admin-digest',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://astrobotacademy.com/api/send-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'digest_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
