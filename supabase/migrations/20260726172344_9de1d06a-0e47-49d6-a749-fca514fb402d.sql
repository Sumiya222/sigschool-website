CREATE TYPE public.team_tier AS ENUM ('leadership', 'team');

ALTER TABLE public.leadership
  ADD COLUMN tier public.team_tier NOT NULL DEFAULT 'leadership';

CREATE INDEX IF NOT EXISTS leadership_tier_order_idx ON public.leadership (tier, "order");