import { useEffect, useMemo, useState } from "react";
import { useSiteContent, useSection, str, list, mediaById, mediaUrl } from "@/lib/site-content";

import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, Users, GraduationCap } from "lucide-react";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { ghostButtonClassName } from "@/components/GhostButton";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const ease = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

// Fallbacks — used only if the CMS row is missing, so the page can never
// render empty. The live copy is edited in the CMS dashboard.
const FALLBACK_SYSTEMS = BRAND.divisions.map((d) => ({
  label: d.label.toUpperCase(),
  status: "OPEN",
}));

const SYSTEM_ICONS = [BookOpen, Users, GraduationCap];

// No stock photography for the placeholder brand — the right-hand panel
// shows only the division overview, not an image carousel.
const FALLBACK_GALLERY: { img: string; alt: string }[] = [];

// Slide timings: systems check dwells longer, images flip faster.
const SYSTEMS_MS = 5000;
const IMAGE_MS = 3600;

const FALLBACK_STATS = [
  { value: "1,200+", label: "STUDENTS" },
  { value: "K–12", label: "GRADES SERVED" },
];

export function Hero() {
  const reduceMotion = useReducedMotion();
  const content = useSiteContent();
  const c = useSection("hero");

  const eyebrow = str(c, "eyebrow", "Lower School · Middle School · Upper School");
  const headline = str(c, "headline", "Where Every Student");
  const headlineGradient = str(c, "headline_gradient", "Finds Their Path");
  const subhead = str(
    c,
    "subhead",
    `${BRAND.name} is a K-12 private school built around academic rigor, character and community — from Kindergarten through Grade 12.`,
  );
  const primaryLabel = str(c, "primary_cta_label", "Explore Academics");
  const primaryTarget = str(c, "primary_cta_target", "/programs");
  const secondaryLabel = str(c, "secondary_cta_label", "Admissions");
  const secondaryTarget = str(c, "secondary_cta_target", "/admissions");
  const systemsTitle = str(c, "systems_title", "OUR DIVISIONS");
  const systemsStatus = str(c, "systems_status", "ENROLLING");
  const systemsFooter = str(c, "systems_footer", "Now enrolling for the coming year");
  const affiliationLabel = str(c, "affiliation_label", "ACCREDITATION");
  const affiliationValue = str(c, "affiliation_value", BRAND.legalName);

  const systems = list<{ label: string; status: string }>(c, "systems", FALLBACK_SYSTEMS);
  const stats = list<{ value: string; label: string }>(c, "stats", FALLBACK_STATS);

  const gallery = useMemo(() => {
    const rows = content.heroCarousel
      .map((row) => {
        const m = mediaById(content, row.media_id);
        const url = mediaUrl(m);
        return url ? { img: url, alt: m?.alt_text ?? "Campus life" } : null;
      })
      .filter(Boolean) as { img: string; alt: string }[];
    return rows.length > 0 ? rows : FALLBACK_GALLERY;
  }, [content]);

  // Panel carousel. active === 0 is the SYSTEMS CHECK slide; 1..N are the
  // activity images. It flows systems → images → back to systems, forever.
  const total = gallery.length + 1;
  const [active, setActive] = useState(0);

  // Preload every gallery image immediately on mount (alongside the 3D scene)
  // so slides swap in instantly instead of lazy-fetching on first view.
  useEffect(() => {
    gallery.forEach(({ img }) => {
      const preload = new Image();
      preload.src = img;
    });
  }, [gallery]);

  // Auto-advance: hold the systems check for 5s, images for less, then loop.
  useEffect(() => {
    if (reduceMotion) return;
    const dur = active === 0 ? SYSTEMS_MS : IMAGE_MS;
    const t = setTimeout(() => setActive((a) => (a + 1) % total), dur);
    return () => clearTimeout(t);
  }, [active, reduceMotion, total]);

  // Manual navigation. Changing `active` re-runs the auto-advance effect above,
  // so the timer simply restarts from the chosen slide — it is never disabled.
  const goTo = (i: number) => setActive(((i % total) + total) % total);
  const goPrev = () => goTo(active - 1);
  const goNext = () => goTo(active + 1);

  return (
    <section className="relative flex min-h-[calc(100dvh-var(--announce-h,0px))] items-center overflow-hidden">
      {/* Local accent glow — transparent so the global star system shows through */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1100px 780px at 78% 40%, color-mix(in oklab, var(--gold) 14%, transparent) 0%, transparent 60%)",
        }}
      />

      {/* Readability scrim behind the copy */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-navy-950/20 via-navy-950/20 to-transparent lg:bg-gradient-to-r lg:from-navy-950/20 lg:via-navy-950/20 lg:to-transparent"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-10 px-4 pt-24 pb-24 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-10 lg:pt-20 lg:pb-16">
        {/* LEFT — headline + CTAs */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="text-center lg:col-span-7 lg:text-left"
        >
          <motion.p
            variants={fadeUp}
            className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-cyan/25 bg-cyan/5 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan"
          >
            <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            {eyebrow}
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="font-display text-[2.5rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-[4.75rem] xl:text-[5.5rem]"
          >
            <span className="block">{headline}</span>
            <span className="block text-cosmic">{headlineGradient}</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-7 max-w-xl text-[1.05rem] leading-relaxed text-gray-mid lg:mx-0 lg:max-w-2xl lg:text-[1.3rem]"
          >
            {subhead}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start"
          >
            <Link to={primaryTarget} className={cn(goldButtonClassName, "w-full sm:w-auto")}>
              {GoldButtonSheen}
              <span className="relative inline-flex items-center gap-2">{primaryLabel}</span>
            </Link>
            <Link to={secondaryTarget} className={cn(ghostButtonClassName, "w-full sm:w-auto")}>
              {secondaryLabel}
            </Link>
          </motion.div>
        </motion.div>

        {/* RIGHT — bento cluster: systems check that morphs into a gallery */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={container}
          className="grid gap-4 lg:col-span-5"
        >
          <motion.div
            variants={fadeUp}
            className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-1.5"
          >
            <div className="group relative h-[19rem] overflow-hidden rounded-[1.1rem] bg-navy-950/50 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--offwhite)_8%,transparent)]">
              <AnimatePresence mode="wait">
                {active === 0 ? (
                  <motion.div
                    key="systems"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 0.98, filter: "blur(6px)" }}
                    transition={{ duration: 0.5, ease }}
                    className="flex h-full flex-col p-5 pb-9"
                  >
                    <div className="flex items-center justify-between">
                      <span className="telemetry text-gray-mid">{systemsTitle}</span>
                      <span className="telemetry text-cyan">{systemsStatus}</span>
                    </div>
                    <ul className="mt-4 flex flex-1 flex-col justify-center space-y-4">
                      {systems.map((s, si) => {
                        const Icon = SYSTEM_ICONS[si % SYSTEM_ICONS.length];
                        return (
                          <li key={s.label} className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center rounded-lg bg-cyan/10 text-cyan">
                              <Icon className="size-4" />
                            </span>
                            <span className="font-mono text-xs tracking-wide text-offwhite/80">
                              {s.label}
                            </span>
                            <span className="ml-auto flex items-center gap-1.5">
                              <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
                              <span className="telemetry text-cyan/90">{s.status}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="telemetry text-center text-gray-mid/70">{systemsFooter}</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`img-${active}`}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease }}
                    className="absolute inset-0"
                  >
                    <img
                      src={gallery[active - 1].img}
                      alt={gallery[active - 1].alt || `Campus life ${active}`}

                      width={1280}
                      height={800}
                      className="h-full w-full object-cover"
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/15 to-transparent" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prev / Next — manual control; auto timer keeps running */}
              <button
                type="button"
                aria-label="Previous slide"
                onClick={goPrev}
                className="absolute left-2.5 top-1/2 z-30 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-navy-950/60 text-offwhite/70 backdrop-blur-sm transition-all duration-200 hover:border-cyan/40 hover:bg-navy-950/80 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={goNext}
                className="absolute right-2.5 top-1/2 z-30 hidden size-9 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-navy-950/60 text-offwhite/70 backdrop-blur-sm transition-all duration-200 hover:border-cyan/40 hover:bg-navy-950/80 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60 lg:grid lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
              >
                <ChevronRight className="size-4" />
              </button>

              {/* dot indicators — always visible; first dot = systems check */}
              <div className="absolute inset-x-0 bottom-3 z-30 flex items-center justify-center gap-1.5">
                {Array.from({ length: total }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={i === 0 ? "Show systems check" : `Show activity ${i}`}
                    aria-current={active === i}
                    onClick={() => goTo(i)}
                    className={
                      "h-1.5 rounded-full transition-all duration-300 " +
                      (active === i ? "w-5 bg-cyan" : "w-1.5 bg-white/40")
                    }
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Credential stats */}
          <motion.dl variants={fadeUp} className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-1.5"
              >
                <div className="rounded-[1.1rem] bg-navy-950/50 px-4 py-4 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--offwhite)_8%,transparent)]">
                  <dd className="font-display text-2xl font-bold text-foreground">{s.value}</dd>
                  <dt className="telemetry mt-1 text-gray-mid">{s.label}</dt>
                </div>
              </div>
            ))}
            <div className="col-span-2 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-1.5">
              <div className="rounded-[1.1rem] bg-navy-950/50 px-4 py-4 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--offwhite)_8%,transparent)]">
                <dt className="telemetry mb-1 text-gray-mid">{affiliationLabel}</dt>
                <dd className="font-display text-lg font-bold leading-snug text-foreground">
                  {affiliationValue}
                </dd>
              </div>
            </div>
          </motion.dl>
        </motion.div>
      </div>
    </section>
  );
}
