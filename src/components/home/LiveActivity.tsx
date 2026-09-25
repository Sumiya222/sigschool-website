import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";
import { mediaById, mediaUrl, str, useSection, useSiteContent } from "@/lib/site-content";
import lineFollower from "@/assets/classroom/line-follower.webp";
import spriteGame from "@/assets/classroom/sprite-game.webp";
import waterRocket from "@/assets/classroom/water-rocket.webp";
import obstacleBot from "@/assets/classroom/obstacle-bot.webp";
import chatbot from "@/assets/classroom/chatbot.webp";
import orbitSim from "@/assets/classroom/orbit-sim.webp";
import smartLight from "@/assets/classroom/smart-light.webp";
import faceFilter from "@/assets/classroom/face-filter.webp";

const ease = [0.22, 1, 0.36, 1] as const;

/* ── PART A — Telemetry stat strip ─────────────────────────────── */

type Stat = {
  label: string;
  value: number | null; // null → static (non-numeric) readout
  display: string; // final rendered value
  prefix?: string;
  suffix?: string;
  isPlaceholder?: boolean;
};

const STATS: Stat[] = [
  { label: "STUDENTS ENGAGED", value: 23000, display: "23,000+", suffix: "+" },
  { label: "LEARNING TRACKS", value: 3, display: "3" },
  { label: "GRADE COVERAGE", value: null, display: "ECE–8" },
  { label: "INSTITUTIONAL PARTNERS", value: 3, display: "3" },
];

function StatChip({ stat, index }: { stat: Stat; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(stat.value === null ? stat.display : "0");

  useEffect(() => {
    if (!inView || stat.value === null) return;
    // Respect reduced-motion: show the final value immediately, no count-up.
    if (reduceMotion) {
      setDisplay(stat.display);
      return;
    }
    let raf = 0;
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const n = Math.round(eased * (stat.value as number));
      setDisplay(`${stat.prefix ?? ""}${n.toLocaleString()}${stat.suffix ?? ""}`);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, stat, reduceMotion]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease }}
      className="relative rounded-xl border border-cyan/15 bg-black/30 p-4 backdrop-blur-md sm:p-5"
    >
      {/* small corner brackets */}
      <span
        aria-hidden
        className="hud-bracket left-1.5 top-1.5 !size-2.5 border-l border-t opacity-60"
      />
      <span
        aria-hidden
        className="hud-bracket right-1.5 top-1.5 !size-2.5 border-r border-t opacity-60"
      />
      <span
        aria-hidden
        className="hud-bracket bottom-1.5 left-1.5 !size-2.5 border-b border-l opacity-60"
      />
      <span
        aria-hidden
        className="hud-bracket bottom-1.5 right-1.5 !size-2.5 border-b border-r opacity-60"
      />

      <div className="flex items-center gap-2">
        <span className="led size-1.5 shrink-0 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
        <span className="telemetry text-cyan/80">{stat.label}</span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
        {display}
      </div>
      {/* Placeholder marker — driven by site_stats.is_placeholder */}
      {stat.isPlaceholder ? (
        <div className="mt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-gray-mid/70">
          Illustrative figure — to be confirmed
        </div>
      ) : null}
    </motion.div>
  );
}

/* ── PART B — "Live from the classroom" marquee ────────────────── */

type Accent = "amber" | "cyan" | "indigo";

type ProjectCard = {
  title: string;
  tag: string;
  image: string;
  accent: Accent;
  description?: string | null;
  descriptionConfirmed?: boolean;
};

const ACCENTS: Record<Accent, { border: string }> = {
  amber: { border: "border-amber-400/25" },
  cyan: { border: "border-cyan/25" },
  indigo: { border: "border-gold/25" },
};

// Accent is chrome, mapped from the project's domain.
const DOMAIN_ACCENT: Record<string, Accent> = {
  robotics: "amber",
  ai: "cyan",
  space: "indigo",
};

// Fallbacks only; live cards come from the `projects` table.
const CARDS: ProjectCard[] = [
  {
    title: "Line-Follower Rover",
    tag: "ROBOTICS · AGES 8–12",
    image: lineFollower,
    accent: "amber",
  },
  { title: "Sprite Chase Game", tag: "AI · AGES 6–10", image: spriteGame, accent: "cyan" },
  { title: "Water-Bottle Rocket", tag: "SPACE · AGES 9–13", image: waterRocket, accent: "indigo" },
  {
    title: "Obstacle-Avoid Bot",
    tag: "ROBOTICS · AGES 10–14",
    image: obstacleBot,
    accent: "amber",
  },
  { title: "Chatbot Companion", tag: "AI · AGES 11–15", image: chatbot, accent: "cyan" },
  { title: "Orbit Simulator", tag: "SPACE · AGES 12–17", image: orbitSim, accent: "indigo" },
  { title: "Smart-Light Circuit", tag: "ROBOTICS · AGES 8–12", image: smartLight, accent: "amber" },
  { title: "Face-Filter Studio", tag: "AI · AGES 9–13", image: faceFilter, accent: "cyan" },
];

function ClassroomCard({ card, unconfirmedNote }: { card: ProjectCard; unconfirmedNote: string }) {
  const a = ACCENTS[card.accent];
  return (
    <article
      className={cn("w-56 shrink-0 rounded-xl border bg-black/30 p-2.5 backdrop-blur-md", a.border)}
    >
      <div className="relative h-28 overflow-hidden rounded-lg">
        <img
          src={card.image}
          alt={card.title}
          loading="lazy"
          width={1024}
          height={576}
          className="h-full w-full object-cover"
        />
        <div className="scanlines pointer-events-none absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <h3 className="mt-3 truncate px-0.5 font-display text-sm font-semibold text-foreground">
        {card.title}
      </h3>
      {card.description ? (
        <p className="mt-1.5 px-0.5 text-[0.75rem] leading-snug text-gray-mid">
          {card.description}
        </p>
      ) : null}
      <span className="mt-2 mb-0.5 ml-0.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/10 px-2 py-0.5">
        <span className="led size-1 rounded-full bg-cyan" />
        <span className="telemetry text-cyan/80">{card.tag}</span>
      </span>
      {/* Placeholder marker — driven by projects.description_confirmed */}
      {card.description && !card.descriptionConfirmed ? (
        <span className="mt-1.5 ml-0.5 block font-mono text-[0.55rem] uppercase tracking-[0.18em] text-gray-mid/70">
          {unconfirmedNote}
        </span>
      ) : null}
    </article>
  );
}

/**
 * LiveActivity — ambient "sense of activity" band beneath the Programs
 * preview. Transparent background so the global planet/starfield shows
 * through. Part A: telemetry stat chips that count up on scroll-into-view.
 * Part B: an auto-scrolling marquee of curated classroom project cards
 * (pauses on hover/touch, frozen under prefers-reduced-motion).
 */
export function LiveActivity() {
  const content = useSiteContent();
  const statusSection = useSection("system_status");
  const classroomsSection = useSection("classrooms");

  // Stat chips read from site_stats; numeric values still count up.
  const stats: Stat[] =
    content.stats.length > 0
      ? content.stats.map((s) => {
          const numeric = Number(s.value.replace(/[^0-9.]/g, ""));
          const isNumeric = /^[0-9.,]+$/.test(s.value);
          return {
            label: s.label,
            value: isNumeric && !Number.isNaN(numeric) ? numeric : null,
            display: isNumeric
              ? `${Number(s.value.replace(/,/g, "")).toLocaleString()}${s.suffix ?? ""}`
              : `${s.value}${s.suffix ?? ""}`,
            suffix: s.suffix ?? undefined,
            isPlaceholder: s.is_placeholder,
          };
        })
      : STATS;

  const cards: ProjectCard[] =
    content.projects.filter((p) => p.visible && mediaUrl(mediaById(content, p.media_id))).length > 0
      ? content.projects
          .filter((p) => p.visible && mediaUrl(mediaById(content, p.media_id)))
          .map((p) => {
            const m = mediaById(content, p.media_id);
            return {
              title: p.title,
              tag: `${p.domain.toUpperCase()} · ${p.age_range}`,
              image: mediaUrl(m) ?? "",
              accent: DOMAIN_ACCENT[p.domain] ?? "cyan",
              description: p.description,
              descriptionConfirmed: p.description_confirmed,
            };
          })
      : CARDS;

  const unconfirmedNote = str(classroomsSection, "unconfirmed_note", "Description to be confirmed");

  return (
    <section aria-label="System status and classroom activity" className="relative py-16 sm:py-20">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        {/* PART A */}
        <div className="flex items-center gap-3">
          <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
          <span className="telemetry text-cyan">
            {str(statusSection, "eyebrow", "SYSTEM STATUS")}
          </span>
          <span aria-hidden className="h-px flex-1 bg-cyan/15" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <StatChip key={s.label} stat={s} index={i} />
          ))}
        </div>

        {/* PART B */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease }}
          className="panel relative mt-8 overflow-hidden rounded-2xl p-5 sm:mt-10 sm:p-6"
        >
          {/* corner brackets */}
          <span aria-hidden className="hud-bracket left-2 top-2 border-l border-t opacity-60" />
          <span aria-hidden className="hud-bracket right-2 top-2 border-r border-t opacity-60" />
          <span aria-hidden className="hud-bracket bottom-2 left-2 border-b border-l opacity-60" />
          <span aria-hidden className="hud-bracket bottom-2 right-2 border-b border-r opacity-60" />

          <div className="flex items-center gap-2">
            <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            <span className="telemetry text-cyan/80">
              {str(classroomsSection, "panel_label", "A GLIMPSE INTO OUR CLASSROOMS")}
            </span>
          </div>

          <div className="marquee mt-5">
            <div className="marquee-track flex gap-4">
              {[...cards, ...cards].map((c, i) => (
                <ClassroomCard key={`${c.title}-${i}`} card={c} unconfirmedNote={unconfirmedNote} />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
