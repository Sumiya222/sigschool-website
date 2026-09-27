import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Check, MessageCircle } from "lucide-react";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { Band, BandHeader, fadeUp, stagger } from "@/components/for-schools/Band";
import { BRAND } from "@/lib/brand";
import { list, setting, str, useSection, useSiteContent } from "@/lib/site-content";

const SLUG = "programs";

type Theme = "dark" | "light";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeOf(c: Record<string, any>, fallback: Theme): Theme {
  return c.theme === "light" ? "light" : c.theme === "dark" ? "dark" : fallback;
}

/* ── 1 · Hero — dark masthead ─────────────────────────────────────────── */

type Fact = { label: string; value: string };

const HERO_FACTS: Fact[] = [
  { label: "Structure", value: "Lower, Middle & Upper School" },
  { label: "Grades Served", value: "Kindergarten – Grade 12" },
  { label: "Focus", value: "Core Academics · Arts · Athletics" },
];

export function PrHero() {
  const c = useSection("hero", SLUG);
  const theme = themeOf(c, "dark");
  const facts = list<Fact>(c, "facts", HERO_FACTS);
  const headline = str(c, "headline", "Academics.");
  const accent = str(c, "headline_gradient", "Built Around Every Student.");

  return (
    <Band theme={theme} label="Academics introduction" hero>
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
            {str(c, "doc_ref", `Academic Catalogue · ${BRAND.shortName}`)}
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
              {str(c, "eyebrow", "Academics")}
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="mt-6 max-w-[22ch] font-display text-[2.5rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-[3.5rem] lg:text-[4.25rem]"
            >
              <span className="block">{headline}</span>
              {accent ? (
                <span className="block bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
                  {accent}
                </span>
              ) : null}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-gray-mid"
            >
              {str(
                c,
                "subhead",
                `From Kindergarten through Grade 12, ${BRAND.name} builds one continuous academic path across Lower, Middle and Upper School — every class, project and milestone designed for where a student is, and where they're headed next.`,
              )}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <a href={str(c, "cta_target", "/admissions")} className={goldButtonClassName}>
                {GoldButtonSheen}
                <span className="relative inline-flex items-center gap-2">
                  {str(c, "cta_label", "Apply for Admission")}
                </span>
              </a>
              <a
                href={str(c, "secondary_cta_target", "/contact")}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                {str(c, "secondary_cta_label", "Ask a Question")}
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

/* ── 2 · Core curriculum pillars — light ──────────────────────────────── */

export function PrFourPrograms() {
  const c = useSection("four_programs", SLUG);
  const theme = themeOf(c, "light");
  const { programs } = useSiteContent();

  const pillarLabel = str(c, "public_label", "Core Curriculum");
  const ctaLabel = str(c, "public_cta_label", "Learn More");
  const ctaTarget = str(c, "public_cta_target", "/academics");

  return (
    <Band
      theme={theme}
      label="Core curriculum pillars"
      sheet="Sheet 01 · Curriculum"
      diagram="robot"
      diagramPosition="right"
      diagramSecondary="drone"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Core Curriculum")}
        headline={str(c, "headline", "Four Pillars.")}
        subhead={
          c.subhead
            ? String(c.subhead)
            : `Every ${BRAND.shortName} student builds on the same foundation — academics, the arts, athletics, and clubs & activities — from Kindergarten through Grade 12.`
        }
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.12 }}
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {programs.map((p) => (
          <motion.article
            key={p.id}
            variants={fadeUp}
            className="flex flex-col rounded-xl border border-navy-950/12 bg-white/70 p-6 sm:p-7"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-navy-950/15 bg-navy-950/[0.04] px-3 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-navy-900">
                {pillarLabel}
              </span>
            </div>

            <h3 className="mt-5 font-display text-[1.4rem] font-bold leading-tight text-navy-950">
              {p.name}
            </h3>
            <p className="mt-3 max-w-2xl text-[0.97rem] leading-relaxed text-navy-900/70">
              {p.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {(p.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-navy-950/12 px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-navy-900/60"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-7 pt-1">
              <a
                href={ctaTarget}
                className="inline-flex items-center gap-2 rounded-full border border-navy-950/20 px-5 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-navy-950 transition-colors hover:border-gold hover:text-gold"
              >
                {ctaLabel}
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            </div>
          </motion.article>
        ))}
      </motion.div>

      {c.note ? (
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-navy-900/65">{String(c.note)}</p>
      ) : null}
    </Band>
  );
}

/* ── 3 · Grade-level divisions — dark ─────────────────────────────────── */

type Track = { title?: string; grades?: string; desc?: string; bullets?: string[] };

const TRACK_ACCENTS = ["#67e8f9", "#818cf8", "#e879a8"];

const DIVISION_DESCRIPTIONS: Record<string, string> = {
  "Lower School":
    "Foundational literacy, numeracy and curiosity — where every academic habit begins.",
  "Middle School":
    "Broader subject depth and growing independence, as students move between specialist teachers.",
  "Upper School":
    "College-preparatory rigor, electives and leadership, building toward graduation.",
};

const DIVISION_BULLETS: Record<string, string[]> = {
  "Lower School": [
    "Homeroom-based classes",
    "Reading, writing & math foundations",
    "Introductory arts & PE",
  ],
  "Middle School": [
    "Departmentalized subject teachers",
    "Elective & club choices open up",
    "Study skills & organization",
  ],
  "Upper School": [
    "Full subject specialization",
    "Advanced & elective coursework",
    "College and career advising",
  ],
};

const TRACK_FALLBACK: Track[] = BRAND.divisions.map((d) => ({
  title: d.label,
  grades: d.range,
  desc: DIVISION_DESCRIPTIONS[d.label] ?? "",
  bullets: DIVISION_BULLETS[d.label] ?? [],
}));

export function PrAgeTracks() {
  const c = useSection("tracks", SLUG);
  const theme = themeOf(c, "dark");
  const items = list<Track>(c, "items", TRACK_FALLBACK);

  return (
    <Band theme={theme} label="Grade-level divisions">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Grade-Level Divisions")}
        headline={str(c, "headline", "Three Divisions. Organized by Grade.")}
        subhead={
          c.subhead
            ? String(c.subhead)
            : `${BRAND.name} groups students by grade, not age — Lower, Middle and Upper School, each with its own pace, teachers and expectations.`
        }
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {items.map((t, i) => {
          const accent = TRACK_ACCENTS[i % TRACK_ACCENTS.length];
          return (
            <motion.article
              key={`${t.title}-${i}`}
              variants={fadeUp}
              className="flex flex-col rounded-xl border border-foreground/12 bg-foreground/[0.03] p-6 backdrop-blur-sm"
              style={{ borderTopColor: accent, borderTopWidth: 2 }}
            >
              <p
                className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em]"
                style={{ color: accent }}
              >
                {t.grades}
              </p>
              <h3 className="mt-3 font-display text-[1.3rem] font-bold text-foreground">
                {t.title}
              </h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-gray-mid">{t.desc}</p>
              <ul className="mt-5 space-y-2">
                {(t.bullets ?? []).map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Check
                      className="mt-0.5 size-3.5 shrink-0"
                      style={{ color: accent }}
                      aria-hidden
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.article>
          );
        })}
      </motion.div>
    </Band>
  );
}

/* ── 4 · What a class looks like — light ──────────────────────────────── */

type Phase = { title?: string; copy?: string };
type Tool = { title?: string; copy?: string };

const PHASE_FALLBACK: Phase[] = [
  {
    title: "Introduction",
    copy: "Teachers open each unit by framing the concept and connecting it to what students already know.",
  },
  {
    title: "Practice",
    copy: "Students work through guided exercises, discussion and hands-on activities to build real understanding.",
  },
  {
    title: "Application",
    copy: "Learning is applied to projects, assessments or presentations that show mastery, not just memorization.",
  },
];

export function PrSessionShape() {
  const c = useSection("session_shape", SLUG);
  const theme = themeOf(c, "light");
  const phases = list<Phase>(c, "phases", PHASE_FALLBACK);
  const tools = list<Tool>(c, "tools", []);

  return (
    <Band
      theme={theme}
      label="Inside a typical class"
      sheet="Sheet 02 · Classroom"
      diagram="circuit"
      diagramPosition="left"
      diagramSecondary="rocket"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Inside a Class")}
        headline={str(c, "headline", "Introduction. Practice. Application.")}
        subhead={
          c.subhead
            ? String(c.subhead)
            : "Every class period follows the same rhythm, at a pace suited to the division — from a first read-aloud in Lower School to an independent seminar in Upper School."
        }
      />

      <motion.ol
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {phases.map((p, i) => (
          <motion.li
            key={`${p.title}-${i}`}
            variants={fadeUp}
            className="rounded-xl border border-navy-950/12 bg-white/70 p-6"
          >
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-navy-900/45">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 font-display text-[1.2rem] font-bold text-navy-950">{p.title}</h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-navy-900/70">{p.copy}</p>
          </motion.li>
        ))}
      </motion.ol>

      {tools.length > 0 && (
        <div className="mt-14">
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-navy-900/55">
            {str(c, "tools_label", "What students use in class")}
          </p>
          <motion.dl
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {tools.map((t, i) => (
              <motion.div
                key={`${t.title}-${i}`}
                variants={fadeUp}
                className="border-t border-navy-950/12 pt-4"
              >
                <dt className="font-display text-[1rem] font-semibold text-navy-950">{t.title}</dt>
                <dd className="mt-1.5 text-[0.9rem] leading-relaxed text-navy-900/70">{t.copy}</dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      )}

      {c.note ? (
        <p className="mt-10 max-w-2xl border-l-2 border-gold/70 pl-4 text-[0.98rem] leading-relaxed text-navy-950">
          {String(c.note)}
        </p>
      ) : null}
    </Band>
  );
}

/* ── 5 · Curriculum depth — light ─────────────────────────────────────── */

type Domain = { title?: string; copy?: string };

const DOMAIN_FALLBACK: Domain[] = [
  {
    title: "Core Subjects",
    copy: "English, mathematics, science and social studies, taught to grade-appropriate depth in every division.",
  },
  {
    title: "Arts & Electives",
    copy: "Visual and performing arts, world languages and electives that widen as students move into Upper School.",
  },
  {
    title: "Athletics & Activities",
    copy: "Physical education, team sports and clubs that build character alongside academics.",
  },
];

const FACTS_FALLBACK: Fact[] = [
  { label: "Divisions", value: "3" },
  { label: "Grades Served", value: "K – 12" },
  { label: "Core Subjects", value: "Every Year" },
];

export function PrCurriculumScale() {
  const c = useSection("curriculum_scale", SLUG);
  const theme = themeOf(c, "light");
  const domains = list<Domain>(c, "domains", DOMAIN_FALLBACK);
  const facts = list<Fact>(c, "facts", FACTS_FALLBACK);

  return (
    <Band
      theme={theme}
      label="Curriculum depth"
      sheet="Sheet 03 · Curriculum"
      diagram="mesh"
      diagramPosition="right"
      diagramSecondary="comet"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Curriculum Depth")}
        headline={str(c, "headline", "A Full Academic Year. Every Core Subject.")}
        subhead={
          c.subhead
            ? String(c.subhead)
            : "Coursework builds year over year across every division, so each grade deepens what came before instead of repeating it."
        }
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {domains.map((d, i) => (
          <motion.div
            key={`${d.title}-${i}`}
            variants={fadeUp}
            className="rounded-xl border border-navy-950/12 bg-white/70 p-6"
          >
            <h3 className="font-display text-[1.15rem] font-bold text-navy-950">{d.title}</h3>
            <p className="mt-3 text-[0.94rem] leading-relaxed text-navy-900/70">{d.copy}</p>
          </motion.div>
        ))}
      </motion.div>

      {facts.length > 0 && (
        <dl className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f, i) => (
            <div key={`${f.label}-${i}`} className="border-t border-navy-950/15 pt-4">
              <dt className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-navy-900/55">
                {f.label}
              </dt>
              <dd className="mt-1.5 font-display text-[1.6rem] font-bold text-navy-950">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {c.note ? (
        <p className="mt-10 max-w-2xl text-[0.98rem] leading-relaxed text-navy-900/75">
          {String(c.note)}
        </p>
      ) : null}
      {c.closing_line ? (
        <p className="mt-4 max-w-2xl border-l-2 border-gold/70 pl-4 text-[0.98rem] leading-relaxed text-navy-950">
          {String(c.closing_line)}
        </p>
      ) : null}
    </Band>
  );
}

/* ── 6 · Closing CTA — dark ───────────────────────────────────────────── */

export function PrClosingCta() {
  const c = useSection("closing_cta", SLUG);
  const theme = themeOf(c, "dark");
  const { settings } = useSiteContent();
  const whatsapp = setting(settings, "whatsapp_url", "");

  return (
    <Band theme={theme} label="Closing call to action">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Get Started")}
        headline={str(c, "headline", "Two Ways In.")}
        subhead={
          c.subhead
            ? String(c.subhead)
            : `Ready to see ${BRAND.shortName} for yourself? Apply for admission or visit campus and meet the team.`
        }
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div
          variants={fadeUp}
          className="flex flex-col rounded-xl border border-gold/25 bg-gold/12 backdrop-blur-md p-7"
        >
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold">
            {str(c, "parent_title", "Explore Admissions")}
          </p>
          <p className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-offwhite/80">
            {str(
              c,
              "parent_copy",
              `Start your family's application to ${BRAND.name} — Lower, Middle or Upper School.`,
            )}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href={str(c, "primary_cta_target", "/admissions")} className={goldButtonClassName}>
              {GoldButtonSheen}
              <span className="relative inline-flex items-center gap-2">
                {str(c, "primary_cta_label", "Apply Now")}
              </span>
            </a>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold/10"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                {str(c, "whatsapp_label", "Message us on WhatsApp")}
              </a>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="flex flex-col rounded-xl border border-cyan/25 bg-cyan/12 backdrop-blur-md p-7"
        >
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-cyan">
            {str(c, "school_title", "Visit Campus")}
          </p>
          <p className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-offwhite/80">
            {str(
              c,
              "school_copy",
              `Tour ${BRAND.addressLine.split(",").slice(-1)[0].trim()} and see classrooms, faculty and student work in person.`,
            )}
          </p>
          <div className="mt-7">
            <a
              href={str(c, "secondary_cta_target", "/contact")}
              className="inline-flex items-center gap-2 rounded-full border border-cyan/40 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-cyan transition-colors hover:bg-cyan/10"
            >
              {str(c, "secondary_cta_label", "Schedule a Visit")}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </Band>
  );
}
