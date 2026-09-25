-- Persists which storage-quota warning thresholds (50%, 80%) have already
-- fired for a bucket, so the once-per-crossing email behavior survives a
-- server restart or a new isolate rather than relying on in-memory state.
-- A row's presence means "already alerted since the last time usage was
-- below this threshold" — deleted again once usage drops back below it, so
-- a later crossing alerts again.
CREATE TABLE public.storage_quota_alert_state (
  bucket_id text NOT NULL,
  threshold_percent integer NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_id, threshold_percent)
);

GRANT ALL ON public.storage_quota_alert_state TO service_role;
ALTER TABLE public.storage_quota_alert_state ENABLE ROW LEVEL SECURITY;
-- Service-role only (server-side quota guard) — no anon/authenticated
-- policies, matching the guard's own service-role-only access pattern.
