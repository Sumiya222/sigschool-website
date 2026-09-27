import { motion } from "framer-motion";
import { ArrowDownRight, Check, Quote } from "lucide-react";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { Band, BandHeader, fadeUp, stagger } from "./Band";
import { list, str, useSection, useSiteContent } from "@/lib/site-content";
import { BRAND } from "@/lib/brand";

const SLUG = "schools";

type Theme = "dark" | "light";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeOf(c: Record<string, any>, fallback: Theme): Theme {
  return c.theme === "light" ? "light" : c.theme === "dark" ? "dark" : fallback;
}

/* ── 1 · Hero — dark, institutional masthead ──────────────────────────── */

type Fact = { label: string; value: string };

const HERO_FACTS: Fact[] = [
  { label: "Divisions", value: "Lower · Middle · Upper School" },
  { label: "Day", value: "8:00 AM – 3:15 PM" },
  { label: "Activities", value: "40+ clubs, arts & athletics" },
  { label: "Reporting", value: "Progress reports every term" },
];

export function FsHero() {
  const c = useSection("hero", SLUG);
  const theme = themeOf(c, "dark");
  const ctaLabel = str(c, "cta_label", "Schedule a Tour");
  const ctaTarget = str(c, "cta_target", "/admissions");
  const secondaryLabel = str(c, "secondary_cta_label", "See the daily schedule");
  const secondaryTarget = str(c, "secondary_cta_target", "#daily-schedule");
  const docRef = str(c, "doc_ref", `Campus Life Overview · ${BRAND.shortName}`);
  const docRev = str(c, "doc_rev", "2026 – 2027");
  const facts = list<Fact>(c, "facts", HERO_FACTS);
  const headline = str(c, "headline", "A Day at");
  const accent = str(c, "headline_gradient", BRAND.shortName + ".");

  return (
    <Band theme={theme} label="Campus life introduction" hero>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="pt-0 -mt-6 lg:-mt-10"
      >
        {/* Document masthead rule */}
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-foreground/12 py-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-gray-mid"
        >
          <span className="inline-flex items-center gap-2.5">
            <span
              aria-hidden
              className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]"
            />
            {docRef}
          </span>
          <span>{docRev}</span>
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
              {str(c, "eyebrow", "Campus Life")}
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
                "From first bell to last practice, a day at " +
                  BRAND.shortName +
                  " blends rigorous academics with the clubs, arts, and athletics that make school feel like home.",
              )}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <a href={ctaTarget} className={goldButtonClassName}>
                {GoldButtonSheen}
                <span className="relative inline-flex items-center gap-2">{ctaLabel}</span>
              </a>
              <a
                href={secondaryTarget}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                {secondaryLabel}
                <ArrowDownRight className="size-3.5" aria-hidden />
              </a>
            </motion.div>
          </motion.div>

          {/* Specification card */}
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
        </motion.div>
      </motion.div>
    </Band>
  );
}

/* ── 2 · Delivery specification — light ───────────────────────────────── */

type Spec = { label: string; value: string };

const DAILY_SPECS: Spec[] = [
  {
    label: "Arrival & Homeroom",
    value: "8:00 – 8:20 AM — advisory, announcements, a slow start to the day.",
  },
  { label: "Class Periods", value: "Six 50-minute periods across core subjects and electives." },
  {
    label: "Lunch & Recess",
    value: "A shared block for every division, staggered by grade level.",
  },
  {
    label: "Activity Period",
    value: "A daily window built into the timetable for clubs and enrichment.",
  },
  {
    label: "After School",
    value: "Athletics, rehearsals, and study hall run until early evening.",
  },
];

export function FsDeliverySpec() {
  const c = useSection("delivery_spec", SLUG);
  const theme = themeOf(c, "light");
  const specs = list<Spec>(c, "specs", DAILY_SPECS);

  return (
    <Band theme={theme} id="daily-schedule" label="Daily schedule" sheet="Sheet 02 · Schedule">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Daily Schedule")}
        headline={str(c, "headline", "How the Day Unfolds.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <motion.dl
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 overflow-hidden rounded-xl border border-navy-950/10 bg-white/60"
      >
        {specs.map((s, i) => (
          <motion.div
            key={`${s.label}-${i}`}
            variants={fadeUp}
            className="grid grid-cols-1 gap-1 border-b border-navy-950/10 px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-6 sm:px-7"
          >
            <dt className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-navy-900/60">
              {s.label}
            </dt>
            <dd className="text-[0.98rem] leading-relaxed text-navy-950">{s.value}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </Band>
  );
}

/* ── 3 · Three-stage framework — dark ─────────────────────────────────── */

type Stage = {
  code?: string;
  stageLabel?: string;
  phase?: string;
  grades?: string;
  desc?: string;
  outcome?: string;
};

const STAGE_ACCENTS = ["#67e8f9", "#818cf8", "#e879a8"];

export function FsFramework() {
  const c = useSection("framework", SLUG);
  const theme = themeOf(c, "dark");
  const stages = list<Stage>(c, "stages", []);

  return (
    <Band theme={theme} label="Three-stage framework">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Three Divisions")}
        headline={str(c, "headline", "Built to Progress, Grade by Grade.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <motion.ol
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3"
      >
        {stages.map((s, i) => {
          const accent = STAGE_ACCENTS[i % STAGE_ACCENTS.length];
          return (
            <motion.li
              key={`${s.phase}-${i}`}
              variants={fadeUp}
              className="relative rounded-xl border border-cyan/15 bg-black/30 p-6 backdrop-blur-md"
            >
              <span
                aria-hidden
                className="absolute inset-x-6 top-0 h-px"
                style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
              />
              <p
                className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em]"
                style={{ color: accent }}
              >
                {s.stageLabel ?? `Stage ${s.code ?? i + 1}`}
              </p>
              <h3 className="mt-3 font-display text-xl font-semibold text-foreground">{s.phase}</h3>
              <p className="mt-1 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-gray-mid/80">
                {s.grades}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-gray-mid">{s.desc}</p>
              {s.outcome ? (
                <p className="mt-5 border-t border-white/10 pt-4 text-sm font-medium text-foreground/90">
                  {s.outcome}
                </p>
              ) : null}
            </motion.li>
          );
        })}
      </motion.ol>
    </Band>
  );
}

/* ── 4 · Curriculum scale — light ─────────────────────────────────────── */

type Card = { title?: string; copy?: string };

const ACTIVITY_DOMAINS: Card[] = [
  {
    title: "Clubs & Interest Groups",
    copy: "From debate to chess to student council — a new club for nearly every interest, every semester.",
  },
  {
    title: "Arts & Performance",
    copy: "Band, choir, theater, and studio art, with a fall and spring showcase for every division.",
  },
  {
    title: "Athletics",
    copy: "Interscholastic and intramural teams across the year, from tryouts through championship season.",
  },
];

const ACTIVITY_FACTS: Spec[] = [
  { label: "Clubs Offered", value: "40+ each year" },
  { label: "Sports Seasons", value: "3 per year" },
  { label: "Arts Showcases", value: "2 per year" },
  { label: "Participation", value: "Open to every student" },
];

export function FsCurriculumScale() {
  const c = useSection("curriculum_scale", SLUG);
  const theme = themeOf(c, "light");
  const domains = list<Card>(c, "domains", ACTIVITY_DOMAINS);
  const facts = list<Spec>(c, "facts", ACTIVITY_FACTS);
  const note = str(c, "note", "");

  return (
    <Band theme={theme} label="Clubs and activities" sheet="Sheet 04 · Activities">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Clubs & Activities")}
        headline={str(c, "headline", "Dozens of Ways to Get Involved.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3"
      >
        {domains.map((d, i) => (
          <motion.div
            key={`${d.title}-${i}`}
            variants={fadeUp}
            className="rounded-xl border border-navy-950/10 bg-white/60 p-6"
          >
            <h3 className="font-display text-lg font-semibold text-navy-950">{d.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-900/70">{d.copy}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.dl
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-navy-950/10 bg-navy-950/10 sm:grid-cols-2 lg:grid-cols-4"
      >
        {facts.map((f, i) => (
          <motion.div
            key={`${f.label}-${i}`}
            variants={fadeUp}
            className="bg-panel-light px-5 py-5"
          >
            <dt className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-navy-900/60">
              {f.label}
            </dt>
            <dd className="mt-2 font-display text-[1.05rem] font-semibold text-navy-950">
              {f.value}
            </dd>
          </motion.div>
        ))}
      </motion.dl>

      {note ? <p className="mt-6 text-sm leading-relaxed text-navy-900/70">{note}</p> : null}
    </Band>
  );
}

/* ── Shared: titled card list (kits, assessment, requirements) ────────── */

function CardList({ theme, items }: { theme: Theme; items: Card[] }) {
  const light = theme === "light";
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((it, i) => (
        <motion.div
          key={`${it.title}-${i}`}
          variants={fadeUp}
          className={
            "rounded-xl border p-6 " +
            (light
              ? "border-navy-950/10 bg-white/60"
              : "border-cyan/15 bg-black/30 backdrop-blur-md")
          }
        >
          <h3
            className={
              "font-display text-lg font-semibold " + (light ? "text-navy-950" : "text-foreground")
            }
          >
            {it.title}
          </h3>
          <p
            className={
              "mt-2 text-sm leading-relaxed " + (light ? "text-navy-900/70" : "text-gray-mid")
            }
          >
            {it.copy}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function BandNote({ theme, children }: { theme: Theme; children: string }) {
  return (
    <p
      className={
        "mt-6 text-sm leading-relaxed " + (theme === "light" ? "text-navy-900/70" : "text-gray-mid")
      }
    >
      {children}
    </p>
  );
}

/* ── 5 · Kits & materials — dark ──────────────────────────────────────── */

const FACILITIES_ITEMS: Card[] = [
  {
    title: "Library & Learning Commons",
    copy: "A quiet research floor and an open collaboration space, open before and after school.",
  },
  {
    title: "Science & Innovation Labs",
    copy: "Dedicated wet labs and a maker space for Lower, Middle, and Upper School courses.",
  },
  {
    title: "Arts Studio & Theater",
    copy: "A black-box theater, music rooms, and a full studio for visual arts.",
  },
  {
    title: "Athletic Center",
    copy: "A gymnasium, weight room, and outdoor fields shared across every sports season.",
  },
  {
    title: "Dining Commons",
    copy: "A full-service dining hall with daily menus for every dietary need.",
  },
  {
    title: "Health & Wellness Suite",
    copy: "An on-campus nurse and counseling office, staffed throughout the school day.",
  },
];

export function FsKits() {
  const c = useSection("kits", SLUG);
  const theme = themeOf(c, "dark");
  const note = str(c, "note", "");
  return (
    <Band theme={theme} label="Facilities">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Facilities")}
        headline={str(c, "headline", "A Campus Built for Every Interest.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <CardList theme={theme} items={list<Card>(c, "items", FACILITIES_ITEMS)} />
      {note ? <BandNote theme={theme}>{note}</BandNote> : null}
    </Band>
  );
}

/* ── 6 · Assessment & reporting — light ───────────────────────────────── */

const ASSESSMENT_ITEMS: Card[] = [
  {
    title: "Progress Reports",
    copy: "Sent home each term, covering academics, growth areas, and teacher notes.",
  },
  {
    title: "Parent-Teacher Conferences",
    copy: "Scheduled twice a year, with additional check-ins available anytime.",
  },
  {
    title: "Family Portal",
    copy: "Grades, attendance, and assignment feedback available online in real time.",
  },
];

export function FsAssessment() {
  const c = useSection("assessment", SLUG);
  const theme = themeOf(c, "light");
  const note = str(c, "note", "");
  return (
    <Band theme={theme} label="Progress reporting" sheet="Sheet 06 · Reporting">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Progress Reporting")}
        headline={str(c, "headline", "Reporting You Can Rely On.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <CardList theme={theme} items={list<Card>(c, "items", ASSESSMENT_ITEMS)} />
      {note ? <BandNote theme={theme}>{note}</BandNote> : null}
    </Band>
  );
}

/* ── 7 · Campus requirements — dark ───────────────────────────────────── */

export function FsRequirements() {
  const c = useSection("requirements", SLUG);
  const theme = themeOf(c, "dark");
  return (
    <Band theme={theme} label="Campus requirements">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Campus Requirements")}
        headline={str(c, "headline", "What We Need From Your Campus.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <CardList theme={theme} items={list<Card>(c, "items", [])} />
    </Band>
  );
}

/* ── 8 · Teacher training & support — light ───────────────────────────── */

function BulletList({ theme, bullets }: { theme: Theme; bullets: string[] }) {
  const light = theme === "light";
  return (
    <motion.ul
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {bullets.map((b, i) => (
        <motion.li
          key={`${b}-${i}`}
          variants={fadeUp}
          className={
            "flex items-start gap-3 rounded-lg border px-4 py-3.5 " +
            (light
              ? "border-navy-950/10 bg-white/60"
              : "border-cyan/15 bg-black/30 backdrop-blur-md")
          }
        >
          <Check
            aria-hidden
            className={"mt-0.5 size-4 shrink-0 " + (light ? "text-gold" : "text-cyan")}
          />
          <span
            className={"text-sm leading-relaxed " + (light ? "text-navy-900/80" : "text-gray-mid")}
          >
            {b}
          </span>
        </motion.li>
      ))}
    </motion.ul>
  );
}

export function FsTraining() {
  const c = useSection("training", SLUG);
  const theme = themeOf(c, "light");
  return (
    <Band
      theme={theme}
      label="Teacher training and support"
      sheet="Sheet 08 · Training"
      diagram="gears"
      diagramPosition="left"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Teacher Training & Support")}
        headline={str(c, "headline", "Your Staff, Supported.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <BulletList theme={theme} bullets={list<string>(c, "bullets", [])} />
    </Band>
  );
}

/* ── 9 · Offered separately — light ───────────────────────────────────── */

export function FsExclusions() {
  const c = useSection("exclusions", SLUG);
  const theme = themeOf(c, "light");
  const note = str(c, "note", "");
  const bullets = list<string>(c, "bullets", []);
  return (
    <Band
      theme={theme}
      label="Offered separately"
      sheet="Sheet 09 · Scope"
      diagram="circuit"
      diagramPosition="right"
      diagramSecondary="drone"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Scope")}
        headline={str(c, "headline", "Offered Separately.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <motion.ul
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-10 flex flex-wrap gap-2.5"
      >
        {bullets.map((b, i) => (
          <motion.li
            key={`${b}-${i}`}
            variants={fadeUp}
            className="rounded-full border border-navy-950/15 bg-white/60 px-4 py-2 text-sm text-navy-900/80"
          >
            {b}
          </motion.li>
        ))}
      </motion.ul>
      {note ? <BandNote theme={theme}>{note}</BandNote> : null}
    </Band>
  );
}

/* ── 10 · Proof + closing CTA — dark ──────────────────────────────────── */

export function FsProofCta() {
  const c = useSection("proof_cta", SLUG);
  const theme = themeOf(c, "dark");
  const { testimonials } = useSiteContent();
  const testimonial = testimonials.filter((t) => t.visible)[0];

  return (
    <Band theme={theme} label="Campus visit and enquiry" id="campus-visit">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Visit Us")}
        headline={str(c, "headline", `Come See ${BRAND.shortName}.`)}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />

      {testimonial ? (
        <motion.figure
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-10 rounded-xl border border-cyan/15 bg-black/30 p-7 backdrop-blur-md"
        >
          <Quote aria-hidden className="size-5 text-cyan/70" />
          <blockquote className="mt-4 text-[1.05rem] leading-relaxed text-foreground/90">
            {testimonial.quote}
          </blockquote>
          {testimonial.attribution ? (
            <figcaption className="mt-4 font-mono text-[0.72rem] uppercase tracking-[0.16em] text-gray-mid/80">
              {testimonial.attribution}
            </figcaption>
          ) : null}
          {testimonial.is_placeholder ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-amber-200">
              <span aria-hidden className="size-1.5 rounded-full bg-amber-300" />
              {str(
                c,
                "testimonial_placeholder_note",
                "Placeholder — awaiting the school's statement.",
              )}
            </p>
          ) : null}
        </motion.figure>
      ) : null}

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="mt-12 rounded-2xl border border-cyan/15 bg-black/30 px-6 py-10 text-center backdrop-blur-md sm:px-10"
      >
        <motion.p
          variants={fadeUp}
          className="mx-auto max-w-2xl text-[1rem] leading-relaxed text-gray-mid"
        >
          {str(
            c,
            "closing_line",
            "The best way to understand a day at " +
              BRAND.shortName +
              " is to spend one on campus. Schedule a tour, meet our faculty, and see the classrooms for yourself.",
          )}
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <a href={str(c, "cta_target", "/admissions")} className={goldButtonClassName}>
            {GoldButtonSheen}
            <span className="relative inline-flex items-center gap-2">
              {str(c, "cta_label", "Schedule a Tour")}
            </span>
          </a>
          <a
            href={str(c, "secondary_cta_target", "/contact")}
            className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            {str(c, "secondary_cta_label", "Contact Us")}
          </a>
        </motion.div>
      </motion.div>
    </Band>
  );
}
