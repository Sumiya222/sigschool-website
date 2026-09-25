-- The daily-admin-digest cron job (see 20260802030000_daily_admin_digest.sql)
-- was silently failing every run: pg_net defaults to a 5000ms timeout, but
-- the request/response leg to the app (cross-continental, plus a possible
-- Passenger cold start on an idle app) was taking ~4.4s and occasionally
-- tipping over 5s, timing the whole call out before the app ever responded.
-- Confirmed live: the identical call succeeds in ~4.5-5s once given more
-- room. Raising the timeout to 20s comfortably covers that with headroom.
SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-admin-digest'),
  command := $$
  SELECT net.http_post(
    url := 'https://astrobotacademy.com/api/send-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'digest_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
