CREATE TABLE public.sheet_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL CHECK (source_table IN ('inquiries','job_applications')),
  record_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_table, record_id)
);

GRANT SELECT ON public.sheet_sync_queue TO authenticated;
GRANT ALL ON public.sheet_sync_queue TO service_role;

ALTER TABLE public.sheet_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sheet sync log"
ON public.sheet_sync_queue FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sheet_sync_queue_touch
BEFORE UPDATE ON public.sheet_sync_queue
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX sheet_sync_queue_pending_idx ON public.sheet_sync_queue (status, created_at);