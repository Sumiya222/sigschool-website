import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { Band, BandHeader, fadeUp, stagger } from "@/components/for-schools/Band";
import { list, str, useSection } from "@/lib/site-content";
import { BRAND } from "@/lib/brand";

const SLUG = "admissions";

type Theme = "dark" | "light";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeOf(c: Record<string, any>, fallback: Theme): Theme {
  return c.theme === "light" ? "light" : c.theme === "dark" ? "dark" : fallback;
}

/* ── 1 · Hero — dark masthead ──────────────────────────────────────────── */

export function AdHero() {
  const c = useSection("hero", SLUG);
  const theme = themeOf(c, "dark");
  const ctaLabel = str(c, "cta_label", "Start an Inquiry");
  const ctaTarget = str(c, "cta_target", "/contact");
  const secondaryLabel = str(c, "secondary_cta_label", "Schedule a Tour");
  const secondaryTarget = str(c, "secondary_cta_target", `mailto:${BRAND.admissionsEmail}`);
  const docRef = str(c, "doc_ref", "Admissions Office · NP / ADM");
  const docRev = str(c, "doc_rev", "Rev. 2026.1");

  return (
    <Band theme={theme} label="Admissions introduction" hero>
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
            {docRef}
          </span>
          <span>{docRev}</span>
        </motion.div>

        <motion.div variants={stagger} className="grid gap-8 pt-10 lg:pt-14">
          <motion.p
            variants={fadeUp}
            className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan"
          >
            {str(c, "eyebrow", "Admissions")}
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="max-w-[24ch] font-display text-[2.5rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-[3.5rem] lg:text-[4.25rem]"
          >
            <span className="block">{str(c, "headline", "Join")}</span>
            <span className="block bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
              {str(c, "headline_gradient", BRAND.shortName)}
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="max-w-2xl text-[1.05rem] leading-relaxed text-gray-mid"
          >
            {str(
              c,
              "subhead",
              `We enrol students from Kindergarten through Grade 12 across our Lower, Middle and Upper Schools. Admission is need-blind in review and built around getting to know each family.`,
            )}
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
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
      </motion.div>
    </Band>
  );
}

/* ── 2 · Admissions process — light, numbered steps ───────────────────── */

type Step = { title: string; body: string };

const DEFAULT_STEPS: Step[] = [
  {
    title: "Inquire",
    body: "Reach out to our admissions office and tell us a little about your student.",
  },
  {
    title: "Tour Campus",
    body: "Visit in person to see classrooms in session and meet current faculty.",
  },
  {
    title: "Submit Application",
    body: "Complete the application and provide the requested records for your student's division.",
  },
  {
    title: "Interview & Assessment",
    body: "Families and applicants meet with admissions; students complete an age-appropriate assessment or visit day.",
  },
  {
    title: "Decision & Enrollment",
    body: "Admissions decisions are communicated directly, followed by enrollment paperwork and orientation details.",
  },
];

export function AdProcess() {
  const c = useSection("process", SLUG);
  const theme = themeOf(c, "light");
  const steps = list<Step>(c, "steps", DEFAULT_STEPS);

  return (
    <Band
      theme={theme}
      label="Admissions process"
      sheet="Sheet 02 · Process"
      diagram="gears"
      diagramPosition="right"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "How It Works")}
        headline={str(c, "headline", "A Straightforward Admissions Process.")}
        subhead={str(c, "subhead", "Five steps from first inquiry to your student's first day.")}
      />

      <motion.ol
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5"
      >
        {steps.map((s, i) => (
          <motion.li
            key={`${s.title}-${i}`}
            variants={fadeUp}
            className="relative rounded-xl border border-navy-950/10 bg-white/60 p-6"
          >
            <span className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-gold">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 font-display text-lg font-semibold text-navy-950">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-navy-900/70">{s.body}</p>
          </motion.li>
        ))}
      </motion.ol>
    </Band>
  );
}

/* ── 3 · Key dates / timeline — dark ───────────────────────────────────── */

export function AdTimeline() {
  const c = useSection("timeline", SLUG);
  const theme = themeOf(c, "dark");

  return (
    <Band theme={theme} label="Admissions timeline">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Timeline")}
        headline={str(c, "headline", "Applications Open Each Fall.")}
        subhead={str(
          c,
          "subhead",
          "Admission is rolling as space allows, and families are encouraged to begin early.",
        )}
      />
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="mt-10 max-w-3xl rounded-xl border border-cyan/15 bg-black/30 p-7 backdrop-blur-md"
      >
        <p className="text-[0.98rem] leading-relaxed text-gray-mid">
          {str(
            c,
            "body",
            `Applications for each upcoming school year typically open in the fall and are reviewed on a rolling basis as space allows in each grade. There is no strict deadline to begin — earlier applications simply have more openings to consider. Contact our admissions office at ${BRAND.admissionsEmail} for current openings by grade.`,
          )}
        </p>
      </motion.div>
    </Band>
  );
}

/* ── 4 · By division — light ───────────────────────────────────────────── */

const DIVISION_NOTES: Record<string, string> = {
  "Lower School": "A readiness assessment and a relaxed classroom visit for the child and family.",
  "Middle School":
    "Prior report cards or transcripts, a brief record review, and a family interview.",
  "Upper School": "Full transcripts, a student interview, and a review of coursework to date.",
};

export function AdDivisions() {
  const c = useSection("divisions", SLUG);
  const theme = themeOf(c, "light");
  const divisions = list<{ label: string; range: string; note?: string }>(
    c,
    "divisions",
    BRAND.divisions.map((d) => ({ ...d, note: DIVISION_NOTES[d.label] })),
  );

  return (
    <Band
      theme={theme}
      label="Admission requirements by division"
      sheet="Sheet 04 · Divisions"
      diagram="mesh"
      diagramPosition="left"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "By Division")}
        headline={str(c, "headline", "Requirements Differ Slightly by Age.")}
        subhead={str(
          c,
          "subhead",
          "Every division follows the same five-step process, with light adjustments to what we ask for.",
        )}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3"
      >
        {divisions.map((d, i) => (
          <motion.div
            key={`${d.label}-${i}`}
            variants={fadeUp}
            className="rounded-xl border border-navy-950/10 bg-white/60 p-6"
          >
            <h3 className="font-display text-lg font-semibold text-navy-950">{d.label}</h3>
            <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-navy-900/50">
              {d.range}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-navy-900/70">{d.note}</p>
          </motion.div>
        ))}
      </motion.div>
    </Band>
  );
}

/* ── 5 · Tuition & financial aid — dark ───────────────────────────────── */

const AID_POINTS = [
  "Tuition is set per grade and division and is shared directly with applying families.",
  "Need-based financial aid and merit scholarships are available and reviewed case by case.",
  "Our admissions office can walk you through payment plans on request.",
];

export function AdTuition() {
  const c = useSection("tuition", SLUG);
  const theme = themeOf(c, "dark");
  const points = list<string>(c, "points", AID_POINTS);

  return (
    <Band theme={theme} label="Tuition and financial aid">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Tuition & Financial Aid")}
        headline={str(c, "headline", "Investing in Your Student.")}
        subhead={str(
          c,
          "subhead",
          "Tuition varies by grade level. Contact our admissions office for current tuition and financial aid information.",
        )}
      />
      <motion.ul
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {points.map((p, i) => (
          <motion.li
            key={`${p}-${i}`}
            variants={fadeUp}
            className="flex items-start gap-3 rounded-lg border border-cyan/15 bg-black/30 px-4 py-3.5 backdrop-blur-md"
          >
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-cyan" />
            <span className="text-sm leading-relaxed text-gray-mid">{p}</span>
          </motion.li>
        ))}
      </motion.ul>
    </Band>
  );
}

/* ── 6 · Closing CTA — light ───────────────────────────────────────────── */

export function AdCta() {
  const c = useSection("cta", SLUG);
  const theme = themeOf(c, "light");

  return (
    <Band
      theme={theme}
      label="Begin the admissions process"
      sheet="Sheet 06 · Inquire"
      diagram="comet"
      diagramPosition="right"
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto max-w-2xl rounded-2xl border border-navy-950/12 bg-white/80 px-6 py-12 text-center sm:px-10"
      >
        <motion.h2
          variants={fadeUp}
          className="font-display text-[1.85rem] font-bold leading-[1.08] tracking-tight text-navy-950 sm:text-[2.15rem]"
        >
          {str(c, "headline", "Ready to Take the Next Step?")}
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="mt-4 text-[0.98rem] leading-relaxed text-navy-900/70"
        >
          {str(
            c,
            "subhead",
            `Our admissions office is ready to answer questions and walk your family through what comes next at ${BRAND.name}.`,
          )}
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8">
          <a
            href={str(c, "cta_target", "/contact")}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold to-gold-bright px-7 py-3 font-display text-small font-semibold text-offwhite shadow-[0_6px_24px_-8px_color-mix(in_oklab,var(--gold)_65%,transparent)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
          >
            {str(c, "cta_label", "Contact Admissions")}
            <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
          </a>
        </motion.div>
      </motion.div>
    </Band>
  );
}
