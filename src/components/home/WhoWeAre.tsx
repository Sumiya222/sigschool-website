import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Hexagon } from "lucide-react";
import { FormationSequence } from "@/components/home/FormationSequence";
import { useSection, str, list } from "@/lib/site-content";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const leftStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

// --- Differentiator spec-sheet rows — the actual pitch -----------------------
// Fallbacks only; live copy comes from page_sections('home','who_we_are').
const DIFFERENTIATORS = [
  {
    label: "SMALL BY DESIGN",
    body: "Class sizes kept low so every student is known, challenged, and supported by name.",
  },
  {
    label: "ONE CONTINUOUS JOURNEY",
    body: "Lower, Middle, and Upper School are built to connect — not three separate schools sharing an address.",
  },
  {
    label: "TEACHERS WHO STAY",
    body: "Faculty who teach here for years, not semesters — mentors students remember long after graduation.",
  },
];

export function WhoWeAre() {
  const c = useSection("who_we_are");
  const eyebrow = str(c, "eyebrow", "Who We Are");
  const headline = str(c, "headline", "More Than a School.");
  const headlineGradient = str(c, "headline_gradient", "A Second Home.");
  const hook = str(
    c,
    "hook",
    "Academics, character, and community woven into one continuous experience from Kindergarten through Grade 12 — by teachers who know every student by name.",
  );
  const items = list<{ label: string; body: string }>(c, "items", DIFFERENTIATORS);
  const linkLabel = str(c, "link_label", "See how we teach");
  const linkTarget = str(c, "link_target", "/about");

  return (
    <section aria-label="Who we are" className="relative w-full py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 items-stretch gap-10 px-4 sm:px-6 lg:grid-cols-[45%_1fr] lg:gap-14 lg:px-10">
        {/* LEFT COLUMN — glass HUD instrument panel, matching the right column */}
        <motion.div
          variants={leftStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="relative flex h-full flex-col rounded-2xl border border-cyan/15 bg-black/30 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:p-8 lg:text-left"
        >
          {/* Corner brackets — HUD display frame (hero motif) */}
          <span aria-hidden className="hud-bracket left-2 top-2 border-l border-t opacity-60" />
          <span aria-hidden className="hud-bracket right-2 top-2 border-r border-t opacity-60" />
          <span aria-hidden className="hud-bracket bottom-2 left-2 border-b border-l opacity-60" />
          <span aria-hidden className="hud-bracket bottom-2 right-2 border-b border-r opacity-60" />

          <motion.p
            variants={fadeUp}
            className="mx-auto inline-flex items-center gap-2.5 self-center rounded-full border border-cyan/25 bg-cyan/5 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan lg:mx-0 lg:self-start"
          >
            <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            {eyebrow}
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="mt-5 font-display text-[2.1rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]"
          >
            {headline} <span className="text-cosmic">{headlineGradient}</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-[1.02rem] leading-relaxed text-gray-mid lg:mx-0"
          >
            {hook}
          </motion.p>

          {/* Differentiator spec-sheet rows — the actual pitch */}
          <motion.ul variants={fadeUp} className="mt-7 flex flex-col gap-4 text-left">
            {items.map((item) => (
              <li key={item.label} className="flex items-start gap-3">
                <Hexagon
                  className="mt-0.5 size-4 shrink-0 text-cyan-bright"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <div>
                  <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-offwhite">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[0.9rem] leading-snug text-gray-mid">{item.body}</p>
                </div>
              </li>
            ))}
          </motion.ul>

          <motion.div variants={fadeUp} className="mt-auto pt-7">
            <Link
              to={linkTarget}
              className="group inline-flex items-center gap-2 text-small font-semibold text-gold-bright transition-colors hover:text-gold"
            >
              {linkLabel}

              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.div>

        {/* RIGHT COLUMN — scripted 3D formation sequence */}
        <FormationSequence />
      </div>
    </section>
  );
}
