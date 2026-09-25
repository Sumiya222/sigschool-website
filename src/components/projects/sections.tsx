import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Camera, X } from "lucide-react";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { Band, BandHeader, fadeUp, stagger } from "@/components/for-schools/Band";
import { useOpenProjectRequest } from "@/components/projects/LightboxShell";
import {
  focalPosition,
  list,
  mediaById,
  mediaUrl,
  str,
  useSection,
  useSiteContent,
  type SiteContent,
} from "@/lib/site-content";

const SLUG = "students";

type Theme = "dark" | "light";
type Project = SiteContent["projects"][number];
type Domain = Project["domain"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeOf(c: Record<string, any>, fallback: Theme): Theme {
  return c.theme === "light" ? "light" : c.theme === "dark" ? "dark" : fallback;
}

/* Domain accents — one colour per discipline, reused by chips, tags and the
   styled placeholder shown where photography does not exist yet. */
const DOMAIN: Record<
  Domain,
  { label: string; dark: string; lightChip: string; lightTag: string; tint: string }
> = {
  robotics: {
    label: "Robotics",
    dark: "border-gold/35 bg-gold/10 text-gold-bright",
    lightChip: "border-gold/60 bg-gold/15 text-navy-950",
    lightTag: "border-gold/50 bg-gold/12 text-navy-900",
    tint: "from-gold/25 via-gold/8 to-transparent",
  },
  ai: {
    label: "Artificial Intelligence",
    dark: "border-cyan/35 bg-cyan/10 text-cyan-bright",
    lightChip: "border-cyan/60 bg-cyan/15 text-navy-950",
    lightTag: "border-cyan/50 bg-cyan/12 text-navy-900",
    tint: "from-cyan/25 via-cyan/8 to-transparent",
  },
  space: {
    label: "Space Science",
    dark: "border-indigo-400/40 bg-indigo-400/10 text-indigo-200",
    lightChip: "border-indigo-500/60 bg-indigo-500/15 text-navy-950",
    lightTag: "border-indigo-500/45 bg-indigo-500/10 text-navy-900",
    tint: "from-indigo-500/25 via-indigo-500/8 to-transparent",
  },
};

function useProjectImage(p: Project) {
  const content = useSiteContent();
  const row = mediaById(content, p.media_id);
  return {
    url: mediaUrl(row),
    alt: row?.alt_text || p.title,
    position: focalPosition(content, p.media_id),
  };
}

/** Styled fallback in the project's own discipline colour — never a broken image. */
function PhotoPending({
  domain,
  label,
  rounded = "rounded-lg",
}: {
  domain: Domain;
  label: string;
  rounded?: string;
}) {
  return (
    <div
      className={`relative flex size-full items-center justify-center overflow-hidden bg-navy-950/80 ${rounded}`}
      aria-hidden
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${DOMAIN[domain].tint}`} />
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 11px)",
        }}
      />
      <div className="relative flex flex-col items-center gap-2 text-center">
        <Camera className="size-5 text-white/50" />
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.22em] text-white/55">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ── 1 · Hero — dark masthead ─────────────────────────────────────────── */

type Fact = { label: string; value: string };

const HERO_FACTS: Fact[] = [
  { label: "Disciplines", value: "Robotics · AI · Space Science" },
  { label: "Age range", value: "5 to 17" },
  { label: "Build outcome", value: "Student keeps the build" },
  { label: "Method", value: "Simulate · wire · debug" },
];

export function PjHero() {
  const c = useSection("hero", SLUG);
  const theme = themeOf(c, "dark");
  const facts = list<Fact>(c, "facts", HERO_FACTS);

  return (
    <Band theme={theme} label="Students introduction" hero>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="pt-0 -mt-6 lg:-mt-10"
      >
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-foreground/12 py-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-gray-mid"
        >
          <span className="inline-flex items-center gap-2.5">
            <span
              aria-hidden
              className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]"
            />
            {str(c, "doc_ref", "Build Record · AB / PRJ")}
          </span>
          <span>{str(c, "doc_rev", "Rev. 2026.1")}</span>
        </motion.div>

        <motion.div
          variants={stagger}
          className="grid gap-12 pt-10 lg:min-h-[27rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 lg:pt-14"
        >
          <motion.div variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan"
            >
              {str(c, "eyebrow", "Students")}
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="mt-6 max-w-[22ch] font-display text-[2.5rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-[3.5rem] lg:text-[4.25rem]"
            >
              <span className="block">{str(c, "headline", "Built by Students.")}</span>
              <span className="block bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
                {str(c, "headline_gradient", "Taken Home.")}
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-gray-mid"
            >
              {str(
                c,
                "subhead",
                "Every project here was designed, wired, debugged and finished by a student — not assembled from a kit with instructions.",
              )}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <a href={str(c, "cta_target", "/schools")} className={goldButtonClassName}>
                {GoldButtonSheen}
                <span className="relative inline-flex items-center gap-2">
                  {str(c, "cta_label", "Partner With Us")}
                </span>
              </a>
              <a
                href={str(c, "secondary_cta_target", "/programs")}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                {str(c, "secondary_cta_label", "See the programs")}
                <ArrowDownRight className="size-3.5" aria-hidden />
              </a>
            </motion.div>
          </motion.div>

          {facts.length > 0 && (
            <motion.dl
              variants={fadeUp}
              className="h-fit rounded-xl border border-foreground/12 bg-foreground/[0.03] p-5 backdrop-blur-sm lg:mt-2"
            >
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-gray-mid">
                At a glance
              </p>
              <div className="mt-4 space-y-3.5">
                {facts.map((f, i) => (
                  <div
                    key={`${f.label}-${i}`}
                    className="border-t border-foreground/10 pt-3.5 first:border-t-0 first:pt-0"
                  >
                    <dt className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-gray-mid">
                      {f.label}
                    </dt>
                    <dd className="mt-1 text-[0.95rem] font-medium text-foreground">{f.value}</dd>
                  </div>
                ))}
              </div>
            </motion.dl>
          )}
        </motion.div>
      </motion.div>
    </Band>
  );
}

/* ── 2 · Featured project — dark. Hidden entirely when none is featured ── */

export function PjFeatured() {
  const c = useSection("featured", SLUG);
  const theme = themeOf(c, "dark");
  const { projects } = useSiteContent();
  const featured = projects.find((p) => p.featured && p.visible);

  if (!featured) return null;
  return <FeaturedBand c={c} theme={theme} project={featured} />;
}

function FeaturedBand({
  c,
  theme,
  project,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: Record<string, any>;
  theme: Theme;
  project: Project;
}) {
  const img = useProjectImage(project);
  const d = DOMAIN[project.domain];

  return (
    <Band theme={theme} label="Featured project">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16"
      >
        <motion.div variants={fadeUp} className="order-2 lg:order-1">
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan">
            {str(c, "eyebrow", "Featured build")}
          </p>
          <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.06] tracking-tight text-foreground sm:text-[2.75rem]">
            {project.title}
          </h2>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] ${d.dark}`}
            >
              {d.label}
            </span>
            <span className="rounded-full border border-foreground/15 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-gray-mid">
              {project.age_range}
            </span>
          </div>
          <p className="mt-6 max-w-2xl text-[1.02rem] leading-relaxed text-gray-mid">
            {project.description ?? ""}
          </p>
          {!project.description_confirmed && project.description ? (
            <p className="mt-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-gray-mid/70">
              Wording not yet confirmed
            </p>
          ) : null}
          <a
            href={str(c, "cta_target", "#build-log")}
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            {str(c, "cta_label", "See the full build log")}
            <ArrowDownRight className="size-3.5" aria-hidden />
          </a>
        </motion.div>

        <motion.div variants={fadeUp} className="order-1 lg:order-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-foreground/12 bg-black/30">
            {img.url ? (
              <img
                src={img.url}
                alt={img.alt}
                loading="lazy"
                className="size-full object-cover"
                style={{ objectPosition: img.position }}
              />
            ) : (
              <PhotoPending
                domain={project.domain}
                label="Photography pending"
                rounded="rounded-2xl"
              />
            )}
            <div className="scanlines pointer-events-none absolute inset-0 opacity-20" />
          </div>
        </motion.div>
      </motion.div>
    </Band>
  );
}

/* ── 3 · Filter + gallery — light specification sheet ─────────────────── */

const FILTERS: ("all" | Domain)[] = ["all", "robotics", "ai", "space"];

export function PjGallery() {
  const c = useSection("gallery", SLUG);
  const theme = themeOf(c, "light");
  const { projects } = useSiteContent();
  const [active, setActive] = useState<"all" | Domain>("all");
  const [open, setOpen] = useState<Project | null>(null);

  const labels: Record<"all" | Domain, string> = {
    all: str(c, "filter_all_label", "All"),
    robotics: str(c, "robotics_label", "Robotics"),
    ai: str(c, "ai_label", "Artificial Intelligence"),
    space: str(c, "space_label", "Space Science"),
  };
  const photoPending = str(c, "photo_pending_label", "Photography pending");
  const unconfirmed = str(c, "unconfirmed_note", "Wording not yet confirmed");

  const visible = useMemo(() => projects.filter((p) => p.visible), [projects]);
  const shown = active === "all" ? visible : visible.filter((p) => p.domain === active);

  // The Featured Students section further down can hand a visitor straight
  // to a student's build: clear any filter that would hide it, scroll the
  // Build Log into view, then open it.
  useOpenProjectRequest(
    useCallback(
      (id: string) => {
        const target = visible.find((p) => p.id === id);
        if (!target) return;
        setActive("all");
        document
          .getElementById("build-log")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
        setOpen(target);
      },
      [visible],
    ),
  );

  return (
    <Band
      theme={theme}
      label="Project gallery"
      id="build-log"
      sheet="Sheet 02 · Build log"
      diagram="mesh"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "The Build Log")}
        headline={str(c, "headline", "The Build Log.")}
        subhead={str(c, "subhead", "")}
      />

      <div
        className="mt-9 flex flex-wrap gap-2.5"
        role="group"
        aria-label="Filter projects by discipline"
      >
        {FILTERS.map((f) => {
          const on = f === active;
          const tone =
            f === "all"
              ? "border-navy-950/50 bg-navy-950/[0.06] text-navy-950"
              : DOMAIN[f as Domain].lightChip;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setActive(f)}
              aria-pressed={on}
              className={`rounded-full border px-4 py-1.5 font-mono text-[0.63rem] uppercase tracking-[0.2em] transition ${
                on
                  ? `${tone} font-semibold shadow-sm`
                  : "border-navy-950/15 bg-white/50 text-navy-900/60 hover:border-navy-950/35 hover:text-navy-950"
              }`}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="mt-12 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-navy-900/50">
          {str(c, "empty_label", "No projects in this discipline yet.")}
        </p>
      ) : (
        <motion.ul
          variants={stagger}
          initial="hidden"
          animate="show"
          className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {shown.map((p) => (
            <GalleryCard
              key={p.id}
              project={p}
              photoPending={photoPending}
              unconfirmed={unconfirmed}
              onOpen={() => setOpen(p)}
            />
          ))}
        </motion.ul>
      )}

      <Lightbox project={open} onClose={() => setOpen(null)} photoPending={photoPending} />
    </Band>
  );
}

function GalleryCard({
  project,
  photoPending,
  unconfirmed,
  onOpen,
}: {
  project: Project;
  photoPending: string;
  unconfirmed: string;
  onOpen: () => void;
}) {
  const img = useProjectImage(project);
  const d = DOMAIN[project.domain];

  return (
    <motion.li variants={fadeUp}>
      <button
        type="button"
        onClick={onOpen}
        className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-navy-950/15 bg-white/60 text-left backdrop-blur-[1px] transition hover:-translate-y-0.5 hover:border-navy-950/35 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-950/40"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          {img.url ? (
            <img
              src={img.url}
              alt={img.alt}
              loading="lazy"
              className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
              style={{ objectPosition: img.position }}
            />
          ) : (
            <PhotoPending domain={project.domain} label={photoPending} rounded="rounded-none" />
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="font-display text-[1.05rem] font-semibold leading-snug text-navy-950">
            {project.title}
          </h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] ${d.lightTag}`}
            >
              {d.label}
            </span>
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-navy-900/55">
              {project.age_range}
            </span>
          </div>
          <p className="mt-3.5 line-clamp-3 text-[0.9rem] leading-relaxed text-navy-900/70">
            {project.description ?? ""}
          </p>
          {!project.description_confirmed && project.description ? (
            <p className="mt-2 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-navy-900/45">
              {unconfirmed}
            </p>
          ) : null}
          <span className="mt-auto pt-4 inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-navy-900/60 transition group-hover:text-navy-950">
            View build
            <ArrowUpRight className="size-3" aria-hidden />
          </span>
        </div>
      </button>
    </motion.li>
  );
}

function Lightbox({
  project,
  onClose,
  photoPending,
}: {
  project: Project | null;
  onClose: () => void;
  photoPending: string;
}) {
  useEffect(() => {
    if (!project) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project ? (
        <LightboxBody project={project} onClose={onClose} photoPending={photoPending} />
      ) : null}
    </AnimatePresence>
  );
}

function LightboxBody({
  project,
  onClose,
  photoPending,
}: {
  project: Project;
  onClose: () => void;
  photoPending: string;
}) {
  const img = useProjectImage(project);
  const d = DOMAIN[project.domain];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-foreground/15 bg-navy-950 text-foreground shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full border border-white/20 bg-black/50 p-2 text-white/80 transition hover:border-cyan/60 hover:text-cyan"
        >
          <X className="size-4" aria-hidden />
        </button>
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {img.url ? (
            <img
              src={img.url}
              alt={img.alt}
              className="size-full object-cover"
              style={{ objectPosition: img.position }}
            />
          ) : (
            <PhotoPending domain={project.domain} label={photoPending} rounded="rounded-none" />
          )}
        </div>
        <div className="p-6 sm:p-8">
          <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {project.title}
          </h3>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] ${d.dark}`}
            >
              {d.label}
            </span>
            <span className="rounded-full border border-foreground/15 px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-gray-mid">
              {project.age_range}
            </span>
          </div>
          <p className="mt-5 text-[1rem] leading-relaxed text-gray-mid">
            {project.description ?? ""}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── 4 · How projects progress — dark ─────────────────────────────────── */

type Stage = { phase: string; grades: string; outcome: string };

const STAGES: Stage[] = [
  {
    phase: "Junior Tinkers",
    grades: "Ages 5–7",
    outcome: "Motors, lights and switches — first working machines.",
  },
  {
    phase: "Young Innovators",
    grades: "Ages 8–12",
    outcome:
      "Sensors, circuit design and block coding — machines that respond to their environment.",
  },
  {
    phase: "Future Engineers",
    grades: "Ages 13–17",
    outcome:
      "Arduino, embedded logic and autonomous systems — machines that make their own decisions.",
  },
];

export function PjProgression() {
  const c = useSection("progression", SLUG);
  const theme = themeOf(c, "dark");
  const items = list<Stage>(c, "items", STAGES);
  const accents = ["gold", "cyan", "indigo"] as const;

  return (
    <Band theme={theme} label="How projects progress">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Progression")}
        headline={str(c, "headline", "Complexity Builds With Age.")}
        subhead={str(c, "subhead", "")}
      />
      <motion.ol
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid gap-6 lg:grid-cols-3"
      >
        {items.map((s, i) => {
          const a = accents[i % accents.length];
          const border =
            a === "gold"
              ? "border-gold/25"
              : a === "cyan"
                ? "border-cyan/25"
                : "border-indigo-400/30";
          const text =
            a === "gold"
              ? "text-gold-bright"
              : a === "cyan"
                ? "text-cyan-bright"
                : "text-indigo-200";
          return (
            <motion.li
              key={`${s.phase}-${i}`}
              variants={fadeUp}
              className={`rounded-xl border bg-foreground/[0.03] p-6 backdrop-blur-sm ${border}`}
            >
              <span className={`font-mono text-[0.6rem] uppercase tracking-[0.26em] ${text}`}>
                Stage {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold text-foreground">{s.phase}</h3>
              <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-gray-mid">
                {s.grades}
              </p>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-gray-mid">{s.outcome}</p>
            </motion.li>
          );
        })}
      </motion.ol>
    </Band>
  );
}

/* ── 5 · Closing CTA — light ──────────────────────────────────────────── */

export function PjClosingCta() {
  const c = useSection("closing_cta", SLUG);
  const theme = themeOf(c, "light");

  const panels = [
    {
      label: str(c, "school_label", "For schools"),
      copy: str(c, "school_copy", ""),
      ctaLabel: str(c, "school_cta_label", "Partner With Us"),
      target: str(c, "school_cta_target", "/schools"),
      primary: true,
    },
    {
      label: str(c, "parent_label", "For parents"),
      copy: str(c, "parent_copy", ""),
      ctaLabel: str(c, "parent_cta_label", "Inquire"),
      target: str(c, "parent_cta_target", "/contact"),
      primary: false,
    },
  ];

  return (
    <Band
      theme={theme}
      label="Closing invitation"
      sheet="Sheet 03 · Next step"
      diagram="mesh"
      diagramPosition="left"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Next step")}
        headline={str(c, "headline", "Want Your Students Building These?")}
        subhead={str(c, "subhead", "")}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid gap-6 lg:grid-cols-2"
      >
        {panels.map((p) => (
          <motion.div
            key={p.label}
            variants={fadeUp}
            className="flex flex-col rounded-xl border border-navy-950/15 bg-white/60 p-7 backdrop-blur-[1px]"
          >
            <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-navy-900/60">
              {p.label}
            </p>
            <p className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-navy-900/75">{p.copy}</p>
            <div className="mt-7">
              {p.primary ? (
                <a href={p.target} className={goldButtonClassName}>
                  {GoldButtonSheen}
                  <span className="relative inline-flex items-center gap-2">{p.ctaLabel}</span>
                </a>
              ) : (
                <a
                  href={p.target}
                  className="inline-flex items-center gap-2 rounded-full border border-navy-950/25 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-navy-900 transition-colors hover:border-navy-950/60 hover:bg-navy-950/[0.04]"
                >
                  {p.ctaLabel}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </Band>
  );
}
