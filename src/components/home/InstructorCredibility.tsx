import { motion } from "framer-motion";
import {
  ShieldCheck,
  GraduationCap,
  BookOpenCheck,
  Award,
  UserCheck,
  Briefcase,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useSiteContent, useSection, str, list } from "@/lib/site-content";

const ease = [0.22, 1, 0.36, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

type Row = {
  code: string;
  kicker: string;
  title: string;
  copy: string;
  stat: string;
  chip: string;
  accent: string;
  icon: LucideIcon;
};

const ROWS: Row[] = [
  {
    code: "01",
    kicker: "WHO TEACHES",
    title: "Certified Classroom Teachers",
    copy: "Every teacher holds a state teaching credential and is interviewed, background-checked, and matched to the age group and subject they know best.",
    stat: "40+",
    chip: "FACULTY MEMBERS",
    accent: "#22d3ee", // cyan-bright
    icon: UserCheck,
  },
  {
    code: "02",
    kicker: "EXPERIENCE",
    title: "Classroom-Tested",
    copy: "Years of experience across public and independent schools — paired with ongoing coaching so instruction keeps improving year over year.",
    stat: "10+ yrs",
    chip: "AVG. TEACHING",
    accent: "#f5c451", // gold-bright
    icon: Briefcase,
  },
  {
    code: "03",
    kicker: "QUALIFICATIONS",
    title: "Advanced Degrees",
    copy: "Bachelor's and Master's degrees in Education and their subject areas — English, Mathematics, Science, History, and the Arts — from accredited colleges and universities.",
    stat: "100%",
    chip: "DEGREE-QUALIFIED",
    accent: "#a78bfa", // indigo / purple
    icon: GraduationCap,
  },
  {
    code: "04",
    kicker: "TRAINING",
    title: "Continuous Development",
    copy: "Every teacher completes our onboarding program — classroom safety, curriculum delivery, and ongoing professional development throughout the year.",
    stat: "80 hrs",
    chip: "ONBOARDING + PD",
    accent: "#22d3ee", // cyan-bright (reused — palette-locked)
    icon: BookOpenCheck,
  },
];

const BADGES: { label: string; icon: LucideIcon }[] = [
  { label: "Background Verified", icon: ShieldCheck },
  { label: "Certified Educators", icon: GraduationCap },
  { label: "Curriculum Trained", icon: BookOpenCheck },
  { label: "Advanced Degrees", icon: Award },
];

// Orbital dots — cardinal positions matching brand palette
const ORBIT_DOTS = [
  { angle: 0, color: "#22d3ee", label: "CYA" }, // top    — cyan-bright
  { angle: 90, color: "#f5c451", label: "GLD" }, // right  — gold-bright
  { angle: 180, color: "#a78bfa", label: "IND" }, // bottom — indigo / purple
  { angle: 270, color: "#22d3ee", label: "CYA" }, // left   — cyan-bright (reused — palette-locked)
];

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/**
 * InstructorCredibility — dark-mode faculty section.
 * Left: orbital diagram (40+ Flight Crew) + Faculty Dossier strip.
 * Right: 4-row vertical timeline on a hairline rail (Who / Experience /
 * Qualifications / Training). Bottom: credibility badge strip.
 */
export function InstructorCredibility() {
  const { facultyClaims } = useSiteContent();
  const c = useSection("faculty");

  const claim = (group: string, key: string) =>
    facultyClaims.find((f) => f.claim_group === group && f.claim_key === key);

  const items = list<{ code: string; kicker: string; title: string; copy: string }>(
    c,
    "items",
    ROWS,
  );
  const rows: Row[] = items.map((it, i) => {
    const base = ROWS[i] ?? ROWS[0];
    const cl = claim("timeline", it.code ?? base.code);
    return {
      ...base,
      code: it.code ?? base.code,
      kicker: it.kicker ?? base.kicker,
      title: it.title ?? base.title,
      copy: it.copy ?? base.copy,
      stat: cl?.value ?? base.stat,
      chip: cl?.label ?? base.chip,
    };
  });

  const dossier = facultyClaims
    .filter((f) => f.claim_group === "dossier")
    .sort((a, b) => a.order - b.order);
  const dossierRows =
    dossier.length > 0
      ? dossier.map((d) => ({ v: d.value, k: d.label }))
      : [
          { v: "100%", k: "Verified" },
          { v: "6+ yrs", k: "Avg. Exp." },
          { v: "80 hrs", k: "Training" },
        ];

  const radial = claim("radial", "flight_crew");
  const radialValue = radial?.value ?? "40+";
  const radialMatch = radialValue.match(/^(.*?)([^0-9A-Za-z]*)$/);
  const radialHead = radialMatch?.[1] || radialValue;
  const radialTail = radialMatch?.[2] || "";
  const radialLabel = radial?.label ?? "Faculty";

  const badgeLabels = list<string>(
    c,
    "badges",
    BADGES.map((b) => b.label),
  );
  const badges = badgeLabels.map((label, i) => ({
    label,
    icon: BADGES[i % BADGES.length].icon,
  }));

  const showPlaceholderNote = facultyClaims.some((f) => f.is_placeholder);

  return (
    <section aria-label="Instructor credibility" className="relative w-full py-20 lg:py-28">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-10">
        {/* ── Section header (centered) ────────────── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={fadeUp}
            className="inline-flex items-center gap-2.5 rounded-full border border-indigo-400/25 bg-indigo-400/5 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-indigo-300"
          >
            <span className="led size-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
            {str(c, "eyebrow", "Our Faculty")}
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="mt-6 font-display text-[2.25rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]"
          >
            {str(c, "headline_before", "Meet the")}{" "}
            <span className="bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
              {str(c, "headline_gradient", "Educators Behind")}
            </span>{" "}
            {str(c, "headline_after", "Every Lesson")}
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-gray-mid"
          >
            {str(
              c,
              "subhead",
              "Families want to know who's in the classroom. Here's exactly who teaches, what they bring, and how they're trained — the people behind every lesson.",
            )}
          </motion.p>

          {showPlaceholderNote && (
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[0.6rem] font-medium uppercase tracking-[0.2em] text-gray-mid/80"
            >
              <span aria-hidden className="size-1 rounded-full bg-gray-mid/60" />
              {str(
                c,
                "placeholder_note",
                "Illustrative figures — final faculty data to be confirmed",
              )}
            </motion.p>
          )}
        </motion.div>

        {/* ── Body: two columns ────────────────────── */}
        <div className="mt-14 grid grid-cols-1 gap-12 lg:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          {/* ── LEFT column ───────────────────────── */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="flex flex-col items-center gap-8"
          >
            {/* Radar diagram */}
            <div className="relative aspect-square w-full max-w-[380px]">
              {/* Ambient glow behind the radar */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-6 rounded-full opacity-70 blur-[60px]"
                style={{
                  background:
                    "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.22), rgba(129,140,248,0.15) 40%, transparent 70%)",
                }}
              />

              {/* Rotating conic sweep */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 0deg, rgba(34,211,238,0) 0deg, rgba(34,211,238,0.35) 40deg, rgba(129,140,248,0.55) 70deg, rgba(34,211,238,0) 110deg, rgba(34,211,238,0) 360deg)",
                  maskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 72%)",
                  WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 60%, transparent 72%)",
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 9, ease: "linear", repeat: Infinity }}
              />

              <svg viewBox="0 0 300 300" className="relative h-full w-full" aria-hidden>
                <defs>
                  <radialGradient id="radar-fade" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(129,140,248,0.18)" />
                    <stop offset="60%" stopColor="rgba(129,140,248,0.05)" />
                    <stop offset="100%" stopColor="rgba(129,140,248,0)" />
                  </radialGradient>
                  <linearGradient id="ring-stroke" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(34,211,238,0.55)" />
                    <stop offset="100%" stopColor="rgba(167,139,250,0.55)" />
                  </linearGradient>
                </defs>

                {/* Fade disc */}
                <circle cx="150" cy="150" r="140" fill="url(#radar-fade)" />

                {/* Concentric rings */}
                <circle
                  cx="150"
                  cy="150"
                  r="130"
                  fill="none"
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="1"
                />
                <circle
                  cx="150"
                  cy="150"
                  r="100"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />
                <circle
                  cx="150"
                  cy="150"
                  r="70"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
                />

                {/* Highlighted outer ring */}
                <circle
                  cx="150"
                  cy="150"
                  r="130"
                  fill="none"
                  stroke="url(#ring-stroke)"
                  strokeWidth="1.25"
                  strokeDasharray="1 5"
                  opacity="0.9"
                />

                {/* Cross-hairs */}
                <line
                  x1="20"
                  y1="150"
                  x2="280"
                  y2="150"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <line
                  x1="150"
                  y1="20"
                  x2="150"
                  y2="280"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />

                {/* Cardinal tick marks */}
                {[0, 90, 180, 270].map((a) => {
                  const p1 = polar(150, 150, 132, a);
                  const p2 = polar(150, 150, 142, a);
                  return (
                    <line
                      key={a}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="1.25"
                    />
                  );
                })}

                {/* Center core */}
                <circle cx="150" cy="150" r="64" fill="rgba(10,13,22,0.55)" />
                <circle
                  cx="150"
                  cy="150"
                  r="64"
                  fill="none"
                  stroke="url(#ring-stroke)"
                  strokeWidth="1"
                  opacity="0.85"
                />

                {/* Orbit dots + pulsing halo */}
                {ORBIT_DOTS.map((d, i) => {
                  const p = polar(150, 150, 130, d.angle);
                  return (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="12" fill={d.color} opacity="0.14" />
                      <circle cx={p.x} cy={p.y} r="7" fill={d.color} opacity="0.28" />
                      <circle cx={p.x} cy={p.y} r="3.75" fill={d.color}>
                        <animate
                          attributeName="opacity"
                          values="1;0.55;1"
                          dur={`${2 + i * 0.35}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  );
                })}
              </svg>

              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <Target
                  className="mb-1.5 size-3.5 text-cyan-bright"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="font-display text-[2.25rem] font-bold leading-none tracking-tight text-foreground sm:text-[2.5rem]">
                  {radialHead}
                  <span className="bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
                    {radialTail}
                  </span>
                </span>
                <span className="mt-1.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.24em] text-gray-mid">
                  {radialLabel}
                </span>
              </div>
            </div>

            {/* Faculty Dossier — horizontal strip */}
            <div className="w-full rounded-2xl border border-white/10 bg-black/35 px-5 py-4 backdrop-blur-md">
              <div className="mb-3 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-gray-mid">
                {str(c, "dossier_label", "Faculty at a Glance")}
              </div>
              <dl className="flex items-baseline justify-between gap-4">
                {dossierRows.map((s) => (
                  <div key={s.k} className="min-w-0">
                    <dt className="font-display text-[1.35rem] font-bold leading-none text-foreground">
                      {s.v}
                    </dt>
                    <dd className="mt-1.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.22em] text-gray-mid">
                      {s.k}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </motion.div>

          {/* ── RIGHT column: vertical timeline ────── */}
          <motion.ol
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="relative"
          >
            {/* Vertical rail */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-[23px] top-6 bottom-6 w-px bg-gradient-to-b from-cyan/50 via-gold-bright/40 to-indigo-400/50"
            />

            <div className="flex flex-col gap-10">
              {rows.map((r) => {
                const Icon = r.icon;
                return (
                  <motion.li
                    key={r.code}
                    variants={fadeUp}
                    style={{ ["--accent" as string]: r.accent }}
                    className="relative flex gap-5"
                  >
                    {/* Timeline node */}
                    <span className="relative z-10 flex size-12 shrink-0 items-center justify-center">
                      <span
                        aria-hidden
                        className="absolute inset-0 rounded-full opacity-25 blur-[10px]"
                        style={{ backgroundColor: r.accent }}
                      />
                      <span
                        className="relative flex size-11 items-center justify-center rounded-full border"
                        style={{
                          borderColor: `color-mix(in oklab, ${r.accent} 55%, transparent)`,
                          backgroundColor: `color-mix(in oklab, ${r.accent} 10%, #0a0d16)`,
                          color: r.accent,
                        }}
                      >
                        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                      </span>
                    </span>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="font-mono text-[0.6rem] font-bold tracking-[0.24em]"
                            style={{ color: r.accent }}
                          >
                            {r.code}
                          </span>
                          <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-gray-mid">
                            {r.kicker}
                          </span>
                        </div>
                        <div
                          className="shrink-0 font-display text-[1.4rem] font-bold leading-none tracking-tight sm:text-[1.6rem]"
                          style={{ color: r.accent }}
                        >
                          {r.stat}
                        </div>
                      </div>

                      <h3 className="mt-2 font-display text-[1.35rem] font-bold leading-snug text-foreground sm:text-[1.55rem]">
                        {r.title}
                      </h3>
                      <p className="mt-2 max-w-xl text-[0.9rem] leading-relaxed text-gray-mid">
                        {r.copy}
                      </p>

                      {/* Chip dash + label */}
                      <div className="mt-3.5 flex items-center gap-2.5">
                        <span
                          aria-hidden
                          className="h-[2px] w-6 rounded-full"
                          style={{ backgroundColor: r.accent }}
                        />
                        <span className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-gray-mid">
                          {r.chip}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </div>
          </motion.ol>
        </div>

        {/* ── Bottom credibility strip ──────────────── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-white/10 bg-black/25 px-6 py-4 backdrop-blur-md lg:mt-16"
        >
          {badges.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-offwhite"
            >
              <Icon className="size-3.5 text-indigo-300" strokeWidth={2} aria-hidden />
              {label}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
