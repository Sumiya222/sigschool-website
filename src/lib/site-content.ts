import { createContext, useContext } from "react";
import type { RegistrationField } from "@/lib/registrations.shared";

/* ── Asset bridge ───────────────────────────────────────────────────────────
   Home imagery already ships as optimised, build-hashed bundle assets. The
   media library records them with a `asset:<name>` storage_path so they are
   editable/orderable from the admin panel without changing the bytes the
   browser downloads. Uploaded media (real Storage paths) resolve to a public
   Storage URL instead. */
import heroRobotics from "@/assets/hero-gallery-robotics.webp";
import heroAI from "@/assets/hero-gallery-ai.webp";
import heroSpace from "@/assets/hero-gallery-space.webp";
import heroCamps from "@/assets/hero-gallery-camps.webp";
import heroEarly from "@/assets/hero-gallery-early.webp";
import heroDrone from "@/assets/hero-gallery-drone.webp";
import lineFollower from "@/assets/classroom/line-follower.webp";
import spriteGame from "@/assets/classroom/sprite-game.webp";
import waterRocket from "@/assets/classroom/water-rocket.webp";
import obstacleBot from "@/assets/classroom/obstacle-bot.webp";
import chatbot from "@/assets/classroom/chatbot.webp";
import orbitSim from "@/assets/classroom/orbit-sim.webp";
import smartLight from "@/assets/classroom/smart-light.webp";
import faceFilter from "@/assets/classroom/face-filter.webp";
import teamP1 from "@/assets/team/p1.jpg";
import teamP2 from "@/assets/team/p2.jpg";
import teamP3 from "@/assets/team/p3.jpg";
import teamP4 from "@/assets/team/p4.jpg";

export const BUNDLED_ASSETS: Record<string, string> = {
  "hero-gallery-robotics.webp": heroRobotics,
  "hero-gallery-ai.webp": heroAI,
  "hero-gallery-space.webp": heroSpace,
  "hero-gallery-camps.webp": heroCamps,
  "hero-gallery-early.webp": heroEarly,
  "hero-gallery-drone.webp": heroDrone,
  "classroom/line-follower.webp": lineFollower,
  "classroom/sprite-game.webp": spriteGame,
  "classroom/water-rocket.webp": waterRocket,
  "classroom/obstacle-bot.webp": obstacleBot,
  "classroom/chatbot.webp": chatbot,
  "classroom/orbit-sim.webp": orbitSim,
  "classroom/smart-light.webp": smartLight,
  "classroom/face-filter.webp": faceFilter,
  "team/p1.jpg": teamP1,
  "team/p2.jpg": teamP2,
  "team/p3.jpg": teamP3,
  "team/p4.jpg": teamP4,
};

/* ── Types ─────────────────────────────────────────────────────────────── */

export type MediaRow = {
  id: string;
  storage_path: string;
  alt_text: string;
  width: number | null;
  height: number | null;
};

export type SiteContent = {
  /** Home page sections, keyed by section key (kept for the Home components). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sections: Record<string, Record<string, any>>;
  /** Every fetched page's sections, keyed by page slug then section key. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pageSections: Record<string, Record<string, Record<string, any>>>;
  settings: Record<string, string>;
  stats: {
    key: string;
    label: string;
    value: string;
    suffix: string | null;
    is_placeholder: boolean;
    order: number;
  }[];
  programs: {
    id: string;
    name: string;
    mod_code: string;
    badge_label: string;
    description: string;
    tags: string[];
    order: number;
    visible: boolean;
  }[];
  projects: {
    id: string;
    title: string;
    domain: "robotics" | "ai" | "space";
    age_range: string;
    media_id: string | null;
    description: string | null;
    description_confirmed: boolean;
    featured: boolean;
    order: number;
    visible: boolean;
  }[];
  partners: {
    id: string;
    name: string;
    blurb: string | null;
    logo_media_id: string | null;
    order: number;
    visible: boolean;
  }[];
  testimonials: {
    id: string;
    quote: string;
    attribution: string | null;
    is_placeholder: boolean;
    visible: boolean;
    order: number;
  }[];
  facultyClaims: {
    id: string;
    claim_group: string;
    claim_key: string;
    label: string;
    value: string;
    description: string | null;
    is_placeholder: boolean;
    order: number;
  }[];
  navItems: {
    id: string;
    label: string;
    target: string;
    location: "nav" | "footer";
    footer_column: string | null;
    order: number;
    visible: boolean;
  }[];
  heroCarousel: { id: string; media_id: string | null; order: number; visible: boolean }[];
  affiliations: {
    id: string;
    name: string;
    scope: "national" | "international";
    note: string | null;
    logo_media_id: string | null;
    order: number;
    visible: boolean;
  }[];
  leadership: TeamMember[];
  media: MediaRow[];
  /** Saved focal points, keyed by media id, so faces stay framed when cropped. */
  focalPoints: Record<string, { x: number; y: number }>;
  campWindow: CampWindow | null;
  /** Active custom questions for the camp registration form, in order. */
  registrationFields: RegistrationField[];
};

export type TeamMember = {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  bio_confirmed: boolean;
  media_id: string | null;
  tier: "leadership" | "team";
  order: number;
  visible: boolean;
};

export type CampWindow = {
  id: string;
  is_open: boolean;
  camp_name: string;
  dates_label: string;
  venue: string;
  age_tracks: string;
  register_label: string;
  register_url: string;
  note: string;
  show_closed_strip: boolean;
  closed_message: string;
  closed_target: string;
  registration_mode: "built_in" | "external" | "closed";
  capacity: number | null;
  /** True when a capacity is set and already reached — the form waitlists. */
  is_full: boolean;
};

export const EMPTY_SITE_CONTENT: SiteContent = {
  sections: {},
  pageSections: {},
  settings: {},
  stats: [],
  programs: [],
  projects: [],
  partners: [],
  testimonials: [],
  facultyClaims: [],
  navItems: [],
  heroCarousel: [],
  affiliations: [],
  leadership: [],
  media: [],
  focalPoints: {},
  campWindow: null,
  registrationFields: [],
};

/* ── Context ───────────────────────────────────────────────────────────── */

export const SiteContentContext = createContext<SiteContent>(EMPTY_SITE_CONTENT);

export function useSiteContent(): SiteContent {
  return useContext(SiteContentContext);
}

/**
 * Section content object for a key, or `{}` when it is missing/hidden.
 * Defaults to the Home page; pass a page slug for any other page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSection(key: string, pageSlug = "home"): Record<string, any> {
  const content = useSiteContent();
  if (pageSlug === "home") return content.sections[key] ?? {};
  return content.pageSections[pageSlug]?.[key] ?? {};
}

/* ── Safe readers — every one falls back to the previous hardcoded value ── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function str(obj: Record<string, any>, key: string, fallback: string): string {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function list<T>(obj: Record<string, any>, key: string, fallback: T[]): T[] {
  const v = obj[key];
  return Array.isArray(v) && v.length > 0 ? (v as T[]) : fallback;
}

export function setting(settings: Record<string, string>, key: string, fallback: string): string {
  const v = settings[key];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/** Resolve a media row to a renderable URL (bundled asset or Storage object). */
export function mediaUrl(row: MediaRow | undefined, supabaseUrl?: string): string | undefined {
  if (!row) return undefined;
  if (row.storage_path.startsWith("asset:")) {
    return BUNDLED_ASSETS[row.storage_path.slice(6)];
  }
  const base = supabaseUrl ?? (import.meta.env.VITE_SUPABASE_URL as string | undefined);
  if (!base) return undefined;
  return `${base}/storage/v1/object/public/site-media/${row.storage_path}`;
}

export function mediaById(content: SiteContent, id: string | null | undefined) {
  if (!id) return undefined;
  return content.media.find((m) => m.id === id);
}

/** CSS object-position for a media id, honouring any saved focal point. */
export function focalPosition(content: SiteContent, id: string | null | undefined): string {
  const p = id ? content.focalPoints[id] : undefined;
  return p ? `${(p.x * 100).toFixed(1)}% ${(p.y * 100).toFixed(1)}%` : "50% 50%";
}

/** Up to two initials for the monogram avatar shown when there's no photo. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
