import { motion } from "framer-motion";
import { Quote } from "lucide-react";

import { cn } from "@/lib/utils";
import { mediaById, mediaUrl, str, useSection, useSiteContent } from "@/lib/site-content";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

/**
 * Schools actually running the AstroBot program in their timetable.
 * Deliberately a distinct list from the "Trusted by and affiliated with"
 * marquee (that row is affiliations/bodies) — do not merge the two.
 */
const RUNNING_SCHOOLS = [
  "ASAS International",
  "Meezan School System",
  "Fazaia Inter College",
  "NICAT",
];

function SchoolBadge({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "group flex aspect-square w-28 shrink-0 items-center justify-center rounded-xl text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_22px_-6px_var(--cyan)] sm:w-36 md:w-[180px]",
        logoUrl
          ? "border border-white/10 bg-white p-5 hover:border-cyan/50"
          : "border border-cyan/15 bg-white/[0.03] p-4 backdrop-blur-md hover:border-cyan/40 hover:bg-cyan/[0.06]",
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          draggable={false}
          loading="lazy"
        />
      ) : (
        <span className="font-display text-sm font-semibold uppercase leading-snug tracking-wide text-gray-mid/70 transition-colors duration-300 group-hover:text-foreground sm:text-base">
          {name}
        </span>
      )}
    </motion.div>
  );
}

export function InstitutionalPartners() {
  const content = useSiteContent();
  const { partners, testimonials } = content;
  const c = useSection("partners");

  const visiblePartners = partners.filter((p) => p.visible);
  const schools =
    visiblePartners.length > 0
      ? visiblePartners.map((p) => ({
          name: p.name,
          logoUrl: mediaUrl(mediaById(content, p.logo_media_id)),
        }))
      : RUNNING_SCHOOLS.map((name) => ({ name, logoUrl: undefined }));

  const testimonial = testimonials.filter((t) => t.visible)[0];
  const quote =
    testimonial?.quote ??
    "[Placeholder — real quote from a partner school or parent to go here once provided.]";
  const attribution = testimonial?.attribution ?? "— Placeholder · Title · School Name";
  const showTestimonialNote = testimonial ? testimonial.is_placeholder : true;

  return (
    <section
      aria-label="Institutional partners and testimonial"
      className="relative flex min-h-[85vh] w-full flex-col items-center justify-center py-16 sm:py-20"
    >
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        {/* ── PART A — Institutional Partners row ─────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="flex flex-col items-center text-center"
        >
          <motion.p
            variants={fadeUp}
            className="inline-flex items-center gap-2.5 rounded-full border border-cyan/25 bg-cyan/5 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan"
          >
            <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            {str(c, "eyebrow", "Institutional Partners")}
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="mt-5 font-display text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-4xl"
          >
            {str(c, "headline", "Schools Already Running the System.")}
          </motion.h2>

          <motion.div
            variants={stagger}
            className="mt-8 flex w-full flex-nowrap justify-center gap-3 overflow-x-auto px-1 py-1 sm:gap-5"
          >
            {schools.map((s) => (
              <SchoolBadge key={s.name} name={s.name} logoUrl={s.logoUrl} />
            ))}
          </motion.div>
        </motion.div>

        {/* ── PART B — Pull-quote panel ───────────────────────────────── */}
        {/* TODO: replace with real testimonial once provided by AstroBot */}
        <motion.figure
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="relative mx-auto mt-12 max-w-[650px] rounded-2xl border border-cyan/15 bg-black/30 px-6 py-10 text-center backdrop-blur-md sm:px-10"
        >
          {/* Corner brackets — HUD display frame (matches other panels) */}
          <span aria-hidden className="hud-bracket left-2 top-2 border-l border-t opacity-60" />
          <span aria-hidden className="hud-bracket right-2 top-2 border-r border-t opacity-60" />
          <span aria-hidden className="hud-bracket bottom-2 left-2 border-b border-l opacity-60" />
          <span aria-hidden className="hud-bracket bottom-2 right-2 border-b border-r opacity-60" />

          <Quote className="mx-auto mb-4 size-8 text-gold-bright" strokeWidth={1.75} aria-hidden />

          <blockquote className="font-display text-lg font-medium leading-relaxed text-offwhite sm:text-xl">
            {quote}
          </blockquote>

          <figcaption className="mt-5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-gray-mid">
            {attribution}
          </figcaption>

          {/* Placeholder marker — driven by testimonials.is_placeholder */}
          {showTestimonialNote ? (
            <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-gray-mid/70">
              {str(
                c,
                "testimonial_placeholder_note",
                "Placeholder testimonial — real quote to be confirmed",
              )}
            </p>
          ) : null}
        </motion.figure>
      </div>
    </section>
  );
}
