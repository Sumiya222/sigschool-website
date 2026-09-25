import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SiteContent } from "@/lib/site-content";
import { EMPTY_SITE_CONTENT } from "@/lib/site-content";

/**
 * Public, unauthenticated read of every CMS table the marketing site needs.
 * Runs through the publishable key so the `TO anon` SELECT policies apply.
 * Never throws — on any failure the components fall back to their built-in
 * defaults, so the public site can never go blank because of a CMS hiccup.
 */

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const getSiteContent = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteContent> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return EMPTY_SITE_CONTENT;

    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    try {
      const [
        sections,
        settings,
        stats,
        programs,
        projects,
        partners,
        testimonials,
        facultyClaims,
        navItems,
        heroCarousel,
        affiliations,
        leadership,
        media,
        campWindow,
        registrationFields,
      ] = await Promise.all([
        supabase
          .from("page_sections")
          .select("page_slug, section_key, content, visible, order")
          .in("page_slug", [
            "home",
            "schools",
            "programs",
            "about",
            "students",
            "contact",
            "careers",
          ])
          .order("order")
          .order("id"),
        supabase.from("site_settings").select("key, value"),
        supabase
          .from("site_stats")
          .select("key, label, value, suffix, is_placeholder, order")
          .order("order")
          .order("id"),
        supabase
          .from("programs")
          .select("id, name, mod_code, badge_label, description, tags, order, visible")
          .eq("visible", true)
          .order("order")
          .order("id"),
        supabase
          .from("projects")
          .select(
            "id, title, domain, age_range, media_id, description, description_confirmed, featured, order, visible",
          )
          .eq("visible", true)
          .order("order")
          .order("id"),
        supabase
          .from("partners_schools")
          .select("id, name, blurb, logo_media_id, order, visible")
          .eq("visible", true)
          .order("order")
          .order("id"),
        supabase
          .from("testimonials")
          .select("id, quote, attribution, is_placeholder, visible, order")
          .eq("visible", true)
          .order("order")
          .order("id"),
        supabase
          .from("faculty_claims")
          .select("id, claim_group, claim_key, label, value, description, is_placeholder, order")
          .order("order")
          .order("id"),
        supabase
          .from("nav_items")
          .select("id, label, target, location, footer_column, order, visible")
          .eq("visible", true)
          .order("order")
          .order("id"),
        supabase
          .from("hero_carousel")
          .select("id, media_id, order, visible")
          .eq("visible", true)
          .order("order")
          .order("id"),
        supabase
          .from("affiliations")
          .select("id, name, scope, note, logo_media_id, order, visible")
          .eq("visible", true)
          .order("order")
          .order("id"),
        supabase
          .from("leadership")
          .select("id, name, title, bio, bio_confirmed, media_id, tier, order, visible")
          .eq("visible", true)
          .order("order")
          .order("id"),
        supabase.from("media").select("id, storage_path, alt_text, width, height"),
        supabase
          .from("camp_window")
          .select(
            "id, is_open, camp_name, dates_label, venue, age_tracks, register_label, register_url, note, show_closed_strip, closed_message, closed_target, registration_mode, capacity",
          )
          .limit(1)
          .maybeSingle(),
        supabase
          .from("registration_fields")
          .select("id, label, field_type, options, required, help_text, order, active")
          .eq("active", true)
          .order("order")
          .order("id"),
      ]);

      const sectionMap: SiteContent["sections"] = {};
      const pageSectionMap: SiteContent["pageSections"] = {};
      for (const row of sections.data ?? []) {
        if (row.visible === false) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = (row.content ?? {}) as Record<string, any>;
        (pageSectionMap[row.page_slug] ??= {})[row.section_key] = content;
        if (row.page_slug === "home") sectionMap[row.section_key] = content;
      }

      const settingMap: SiteContent["settings"] = {};
      let focalPoints: SiteContent["focalPoints"] = {};
      for (const row of settings.data ?? []) {
        const v = row.value;
        if (row.key === "_media_focal_points") {
          const parsed = typeof v === "string" ? safeParse(v) : v;
          if (parsed && typeof parsed === "object") {
            focalPoints = parsed as SiteContent["focalPoints"];
          }
          continue;
        }
        settingMap[row.key] = typeof v === "string" ? v : v == null ? "" : String(v);
      }

      // Capacity is checked server-side so the banner and form can say
      // "waitlist" before a parent fills anything in.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const campRow = campWindow.data as any;
      let camp: SiteContent["campWindow"] = null;
      if (campRow) {
        let isFull = false;
        if (campRow.capacity != null) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const { count } = await supabaseAdmin
              .from("registrations")
              .select("id", { count: "exact", head: true })
              .eq("camp_name", campRow.camp_name)
              .in("status", ["new", "confirmed"]);
            isFull = (count ?? 0) >= campRow.capacity;
          } catch {
            isFull = false;
          }
        }
        camp = { ...campRow, is_full: isFull } as SiteContent["campWindow"];
      }

      return {
        sections: sectionMap,
        pageSections: pageSectionMap,
        settings: settingMap,
        stats: (stats.data ?? []) as SiteContent["stats"],
        programs: (programs.data ?? []) as SiteContent["programs"],
        projects: (projects.data ?? []) as SiteContent["projects"],
        partners: (partners.data ?? []) as SiteContent["partners"],
        testimonials: (testimonials.data ?? []) as SiteContent["testimonials"],
        facultyClaims: (facultyClaims.data ?? []) as SiteContent["facultyClaims"],
        navItems: (navItems.data ?? []) as SiteContent["navItems"],
        heroCarousel: (heroCarousel.data ?? []) as SiteContent["heroCarousel"],
        affiliations: (affiliations.data ?? []) as SiteContent["affiliations"],
        leadership: (leadership.data ?? []) as SiteContent["leadership"],
        media: (media.data ?? []) as SiteContent["media"],
        focalPoints,
        campWindow: camp,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        registrationFields: ((registrationFields.data ?? []) as any[]).map((f) => ({
          ...f,
          options: Array.isArray(f.options) ? (f.options as string[]) : [],
        })) as SiteContent["registrationFields"],
      };
    } catch {
      return EMPTY_SITE_CONTENT;
    }
  },
);
