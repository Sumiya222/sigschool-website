import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Users, FileText, GraduationCap, type LucideIcon } from "lucide-react";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { list, str, useSection } from "@/lib/site-content";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

type Feature = { label: string; icon: LucideIcon; accent: string };
const FEATURES: Feature[] = [
  { label: "Curriculum provided by AstroBot", icon: BookOpen, accent: "#67e8f9" },
  { label: "Instructors deployed by level", icon: Users, accent: "#5cbdb9" },
  { label: "Term-wise reporting", icon: FileText, accent: "#818cf8" },
  { label: "Optional teacher training", icon: GraduationCap, accent: "#e879a8" },
];

type Stage = {
  code: string;
  stageLabel: string;
  phase: string;
  grades: string;
  outcome: string;
  accent: string;
};
const STAGES: Stage[] = [
  {
    code: "01",
    stageLabel: "STAGE 01",
    phase: "FOUNDATION",
    grades: "ECE–Grade 2",
    outcome: "Conceptual awareness & curiosity.",
    accent: "#67e8f9",
  },
  {
    code: "02",
    stageLabel: "STAGE 02",
    phase: "APPLICATION",
    grades: "Grade 3–5",
    outcome: "Systems thinking & structured building.",
    accent: "#818cf8",
  },
  {
    code: "03",
    stageLabel: "STAGE 03",
    phase: "ENGINEERING",
    grades: "Grade 6–8",
    outcome: "Design, integration, independent problem-solving.",
    accent: "#e879a8",
  },
];

/**
 * ForSchools — full-width institutional band.
 * Top: headline + supporting copy row.
 * Middle: 4 horizontal feature pills.
 * Bottom: "Progression Ladder" — three stage cards connected by a hairline.
 */
export function ForSchools() {
  const c = useSection("for_schools");

  const checklist = list<string>(
    c,
    "checklist",
    FEATURES.map((f) => f.label),
  );
  const features = checklist.map((label, i) => ({
    label,
    icon: FEATURES[i % FEATURES.length].icon,
    accent: FEATURES[i % FEATURES.length].accent,
  }));

  const stageCopy = list<Omit<Stage, "accent">>(c, "stages", STAGES);
  const stages: Stage[] = stageCopy.map((st, i) => ({
    ...STAGES[i % STAGES.length],
    ...st,
    accent: STAGES[i % STAGES.length].accent,
  }));

  return (
    <section aria-label="For schools" className="relative w-full py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        {/* ── Header row ───────────────────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-1 gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end lg:gap-14"
        >
          <div>
            <motion.p
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 rounded-full border border-cyan/25 bg-cyan/5 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan"
            >
              <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
              {str(c, "eyebrow", "For Schools")}
            </motion.p>

            <motion.h2
              variants={fadeUp}
              className="mt-6 font-display text-[2.25rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-[4rem]"
            >
              {str(c, "headline", "A Formal Subject.")}{" "}
              <span className="bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
                {str(c, "headline_gradient", "Not an Add-On.")}
              </span>
            </motion.h2>
          </div>

          <motion.p
            variants={fadeUp}
            className="max-w-md text-[1rem] leading-relaxed text-gray-mid lg:pb-3"
          >
            {str(
              c,
              "hook",
              "40-minute weekly sessions, built into your timetable — curriculum, kits, and reporting fully supplied.",
            )}
          </motion.p>
        </motion.div>

        {/* ── Feature pills row ────────────────────── */}
        <motion.ul
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4"
        >
          {features.map(({ label, icon: Icon, accent }) => (
            <motion.li
              key={label}
              variants={fadeUp}
              style={{ ["--accent" as string]: accent }}
              className="group relative flex items-center gap-3.5 rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:var(--accent)]/60 hover:bg-black/40"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
                }}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="font-mono text-[0.7rem] font-bold uppercase leading-snug tracking-[0.14em] text-offwhite">
                {label}
              </span>
            </motion.li>
          ))}
        </motion.ul>

        {/* ── Progression ladder ───────────────────── */}
        <div className="mt-16 lg:mt-20">
          <div className="flex items-center gap-4">
            <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gray-mid">
              {str(c, "ladder_label", "Progression Ladder")}
            </span>
            <span
              aria-hidden
              className="h-px flex-1 bg-gradient-to-r from-white/15 via-white/8 to-transparent"
            />
            <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-gray-mid">
              {str(c, "ladder_range", "ECE → Grade 8")}
            </span>
          </div>

          <motion.ol
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="relative mt-6 grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            {/* Horizontal connector rail (desktop) */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-8 right-8 top-[3.75rem] hidden h-px bg-gradient-to-r from-cyan/40 via-indigo-400/40 to-fuchsia-400/40 md:block"
            />

            {stages.map((s) => (
              <motion.li
                key={s.code}
                variants={fadeUp}
                style={{ ["--accent" as string]: s.accent }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--accent)]/50 hover:shadow-[0_24px_60px_-28px_var(--accent)]"
              >
                {/* Corner brackets */}
                <span
                  aria-hidden
                  className="hud-bracket left-2 top-2 border-l border-t opacity-50"
                  style={{ color: s.accent }}
                />
                <span
                  aria-hidden
                  className="hud-bracket right-2 top-2 border-r border-t opacity-50"
                  style={{ color: s.accent }}
                />
                <span
                  aria-hidden
                  className="hud-bracket bottom-2 left-2 border-b border-l opacity-50"
                  style={{ color: s.accent }}
                />
                <span
                  aria-hidden
                  className="hud-bracket bottom-2 right-2 border-b border-r opacity-50"
                  style={{ color: s.accent }}
                />

                <div className="flex items-center gap-3">
                  <span
                    className="relative z-10 flex size-11 items-center justify-center rounded-full border font-mono text-sm font-bold tracking-tight"
                    style={{
                      color: s.accent,
                      borderColor: `${s.accent}80`,
                      backgroundColor: "rgba(0,0,0,0.55)",
                      boxShadow: `0 0 18px ${s.accent}40, inset 0 0 12px ${s.accent}22`,
                    }}
                  >
                    {s.code}
                  </span>
                  <div className="flex items-baseline gap-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em]">
                    <span style={{ color: s.accent }}>{s.stageLabel}</span>
                    <span className="text-gray-mid">·</span>
                    <span className="text-gray-mid">{s.phase}</span>
                  </div>
                </div>

                <h3 className="mt-6 font-display text-[1.75rem] font-bold leading-tight tracking-tight text-foreground">
                  {s.grades}
                </h3>
                <p className="mt-2 text-body leading-relaxed text-gray-mid">{s.outcome}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>

        {/* ── CTA ──────────────────────────────────── */}
        <div className="mt-12 flex justify-center lg:mt-16">
          <Link to={str(c, "cta_target", "/schools")} className={goldButtonClassName}>
            {GoldButtonSheen}
            <span className="relative inline-flex items-center gap-2">
              {str(c, "cta_label", "Partner With Us")}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
