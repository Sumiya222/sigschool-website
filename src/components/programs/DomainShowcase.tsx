import { useMemo, useState, type ReactNode } from "react";
import { useSection, str, list } from "@/lib/site-content";

import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BookOpen, Users, GraduationCap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

type Domain = {
  id: string;
  code: string;
  title: string;
  tagline: string;
  desc: string;
  bullets: string[];
  icon: LucideIcon;
  accent: string;
  selectorDesc: string;
};

const DOMAINS: Domain[] = [
  {
    id: "lower",
    code: "DIVISION 01",
    title: BRAND.divisions[0].label,
    tagline: BRAND.divisions[0].range,
    desc: "Foundational literacy, math, and a love of learning — small classrooms where every student is known by name and every question is welcome.",
    bullets: [
      "Foundational reading, writing, and math",
      "Hands-on science and discovery time",
      "Homeroom teachers who stay with the class",
    ],
    icon: BookOpen,
    accent: "#67e8f9",
    selectorDesc: "Foundational academics and a love of learning.",
  },
  {
    id: "middle",
    code: "DIVISION 02",
    title: BRAND.divisions[1].label,
    tagline: BRAND.divisions[1].range,
    desc: "A bridge from childhood to young adulthood — students take on more independence, deeper coursework, and their first real clubs and teams.",
    bullets: [
      "Departmentalized academics across core subjects",
      "Advisory groups and study-skills coaching",
      "First clubs, teams, and leadership roles",
    ],
    icon: Users,
    accent: "#818cf8",
    selectorDesc: "Growing independence and deeper coursework.",
  },
  {
    id: "upper",
    code: "DIVISION 03",
    title: BRAND.divisions[2].label,
    tagline: BRAND.divisions[2].range,
    desc: "College-preparatory rigor paired with real mentorship — advanced coursework, college counseling, and the space to find a genuine passion.",
    bullets: [
      "Honors and advanced coursework",
      "Dedicated college and career counseling",
      "Leadership, athletics, and the arts",
    ],
    icon: GraduationCap,
    accent: "#f5c56b",
    selectorDesc: "College-preparatory rigor and real mentorship.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export type DomainShowcaseProps = {
  /** Replace the default header block. Pass `null` to hide entirely. */
  header?: ReactNode;
  /**
   * "scroll"   → Explore smooth-scrolls to #programs on the same page (default, used on /programs)
   * "navigate" → Explore navigates to /programs (used on Home)
   */
  exploreVariant?: "scroll" | "navigate";
  /** Wrapper section className override (padding). */
  className?: string;
};

export function DomainShowcase({
  header,
  exploreVariant = "scroll",
  className,
}: DomainShowcaseProps = {}) {
  const [activeId, setActiveId] = useState("lower");
  const c = useSection("core_domains");

  // CMS copy is merged over the hardcoded spec so icons/accents/3D stay in code.
  const domains = useMemo(() => {
    const overrides = list<Partial<Domain> & { id: string }>(c, "domains", []);
    if (overrides.length === 0) return DOMAINS;
    return DOMAINS.map((d) => {
      const o = overrides.find((x) => x.id === d.id);
      return o ? { ...d, ...o, icon: d.icon, accent: d.accent } : d;
    });
  }, [c]);

  const active = domains.find((d) => d.id === activeId) ?? domains[0];
  const navigate = useNavigate();

  const handleExplore = (e: React.MouseEvent) => {
    e.preventDefault();
    if (exploreVariant === "navigate") {
      navigate({ to: "/programs", hash: "programs" });
      return;
    }
    document.getElementById("programs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const defaultHeader = (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="font-display text-[2.25rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]"
      >
        Three divisions.
        <br />
        <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-indigo-500 bg-clip-text text-transparent">
          One school.
        </span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.1 }}
        className="max-w-sm text-small leading-relaxed text-gray-mid lg:text-right"
      >
        Every {BRAND.shortName} student moves through three connected divisions — built to grow with
        them from their first day to graduation.
      </motion.p>
    </div>
  );

  return (
    <section
      aria-label="Our three school divisions"
      className={cn("relative w-full pt-32 pb-12 lg:pt-40 lg:pb-20", className)}
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        {header === undefined ? defaultHeader : header}

        {/* Main grid */}
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.22fr_1fr]">
          {/* LEFT — featured panel */}
          <div
            style={{ ["--accent" as string]: active.accent }}
            className="relative overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/40 backdrop-blur-md transition-shadow duration-500"
          >
            {/* Corner brackets */}
            <span
              aria-hidden
              className="hud-bracket left-3 top-3 border-l border-t opacity-60"
              style={{ color: active.accent }}
            />
            <span
              aria-hidden
              className="hud-bracket right-3 top-3 border-r border-t opacity-60"
              style={{ color: active.accent }}
            />
            <span
              aria-hidden
              className="hud-bracket bottom-3 left-3 border-b border-l opacity-60"
              style={{ color: active.accent }}
            />
            <span
              aria-hidden
              className="hud-bracket bottom-3 right-3 border-b border-r opacity-60"
              style={{ color: active.accent }}
            />

            {/* Placeholder visual — gradient panel + division icon, no stock photography */}
            <div className="relative h-56 overflow-hidden sm:h-72 lg:h-80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    background: `radial-gradient(120% 120% at 50% 0%, color-mix(in oklab, ${active.accent} 20%, transparent) 0%, transparent 60%), #05060f`,
                  }}
                >
                  <active.icon
                    className="size-24 opacity-25 sm:size-32"
                    style={{ color: active.accent }}
                    strokeWidth={1}
                    aria-hidden
                  />
                </motion.div>
              </AnimatePresence>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
              <span
                className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-full border bg-black/60 px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] backdrop-blur-md"
                style={{ color: active.accent, borderColor: `${active.accent}55` }}
              >
                <span
                  className="led size-1 rounded-full"
                  style={{ backgroundColor: active.accent, boxShadow: `0 0 8px ${active.accent}` }}
                />
                {active.code}
              </span>
            </div>

            {/* Content */}
            <div className="p-6 lg:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease }}
                >
                  <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {active.title}
                  </h2>
                  <p
                    className="mt-2 font-mono text-xs uppercase tracking-[0.18em]"
                    style={{ color: active.accent }}
                  >
                    {active.tagline}
                  </p>
                  <p className="mt-4 text-body leading-relaxed text-gray-mid">{active.desc}</p>

                  <ul className="mt-6 space-y-2.5">
                    {active.bullets.map((b) => (
                      <li key={b} className="flex gap-3 text-small text-gray-mid">
                        <span
                          aria-hidden
                          className="mt-2 size-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: active.accent,
                            boxShadow: `0 0 8px ${active.accent}`,
                          }}
                        />
                        {b}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={exploreVariant === "navigate" ? "/programs" : "#programs"}
                    onClick={handleExplore}
                    className="mt-7 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      color: active.accent,
                      borderColor: `${active.accent}66`,
                      boxShadow: `0 0 0 1px transparent`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${active.accent}10`;
                      e.currentTarget.style.borderColor = active.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = `${active.accent}66`;
                    }}
                  >
                    {str(c, "cta_prefix", "Explore")} {active.title}
                    <ArrowRight className="size-4" />
                  </a>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* RIGHT — compact HUD selector rail */}
          <div className="flex flex-col justify-center gap-3">
            {domains.map((d) => {
              const Icon = d.icon;
              const isActive = d.id === activeId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveId(d.id)}
                  aria-pressed={isActive}
                  style={{ ["--accent" as string]: d.accent }}
                  className={cn(
                    "group relative flex items-center gap-4 overflow-hidden rounded-lg p-4 text-left backdrop-blur-md transition-all duration-300",
                    "border border-t border-r border-b border-l-[3px]",
                    isActive
                      ? "border-l-[color:var(--accent)] border-y-white/10 border-r-white/10 bg-[color:var(--accent)]/[0.06] ring-1 ring-[color:var(--accent)]/25 shadow-[0_0_25px_-8px_var(--accent)]"
                      : "border-l-transparent border-y-white/5 border-r-white/5 bg-transparent opacity-80 hover:-translate-y-0.5 hover:border-l-[color:var(--accent)]/50 hover:bg-white/[0.03] hover:opacity-100",
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[color:var(--accent)]/[0.08] to-transparent"
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex size-11 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      isActive
                        ? "border-[color:var(--accent)]/40 bg-[color:var(--accent)]/[0.12] text-[color:var(--accent)] shadow-[inset_0_0_10px_color-mix(in_oklab,var(--accent)_25%,transparent)]"
                        : "border-white/10 bg-black/40 text-gray-mid group-hover:border-[color:var(--accent)]/40 group-hover:text-[color:var(--accent)]",
                    )}
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <span
                      className={cn(
                        "block font-mono text-[0.6rem] font-semibold uppercase tracking-[0.22em] transition-colors",
                        isActive
                          ? "text-[color:var(--accent)]/80"
                          : "text-gray-mid/70 group-hover:text-[color:var(--accent)]/70",
                      )}
                    >
                      {d.code}
                    </span>
                    <h3
                      className={cn(
                        "mt-0.5 font-display text-[1rem] font-bold leading-tight transition-colors",
                        isActive ? "text-foreground" : "text-gray-mid group-hover:text-foreground",
                      )}
                    >
                      {d.title}
                    </h3>
                    <p className="mt-1 truncate text-[0.72rem] leading-relaxed text-gray-mid/80">
                      {d.selectorDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
