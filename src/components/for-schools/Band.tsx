import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BandDiagram, type DiagramKind } from "./Diagrams";

const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

/**
 * A full-width page band. `light` renders the opaque specification surface,
 * `dark` stays transparent so the persistent space scene reads through.
 * The alternation itself is CMS-driven (each section stores its background).
 */
export function Band({
  theme,
  label,
  id,
  hero,
  sheet,
  diagram,
  diagramPosition = "right",
  diagramSecondary,
  children,
}: {
  theme: "dark" | "light";
  label: string;
  id?: string;
  /** Marks this Band as the page's hero — fills the viewport below the fixed nav/announcement bar. */
  hero?: boolean;
  /** Drafting-sheet reference printed in the corner of a light band. */
  sheet?: string;
  /** Optional technical line drawing printed in the margin of a light band. */
  diagram?: DiagramKind;
  diagramPosition?: "left" | "right";
  /** Optional second drawing printed in the opposite margin. */
  diagramSecondary?: DiagramKind;
  children: ReactNode;
}) {
  const light = theme === "light";
  const heroClass = hero ? "min-h-[calc(100dvh-var(--announce-h,0px))] flex items-center " : "";
  return (
    <section
      id={id}
      aria-label={label}
      className={
        heroClass +
        (light
          ? "blueprint-band relative w-full scroll-mt-24 py-20 text-navy-950 lg:py-28"
          : "relative w-full scroll-mt-24 py-20 text-foreground lg:py-28")
      }
    >
      {light ? <SheetMarks sheet={sheet} label={label} /> : null}
      {light && diagram ? <BandDiagram kind={diagram} position={diagramPosition} /> : null}
      {light && diagramSecondary ? (
        <BandDiagram
          kind={diagramSecondary}
          position={diagramPosition === "left" ? "right" : "left"}
          anchor="top"
        />
      ) : null}
      <div className="relative z-[1] mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        {children}
      </div>
    </section>
  );
}

/** Corner registration ticks and the sheet reference on a blueprint band. */
function SheetMarks({ sheet, label }: { sheet?: string; label: string }) {
  const corner = "absolute size-4 border-navy-950/25";
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
      <div className="absolute inset-4 sm:inset-6 lg:inset-8">
        <span className={`${corner} left-0 top-0 border-l border-t`} />
        <span className={`${corner} right-0 top-0 border-r border-t`} />
        <span className={`${corner} bottom-0 left-0 border-b border-l`} />
        <span className={`${corner} bottom-0 right-0 border-b border-r`} />
      </div>
      <span className="absolute bottom-6 right-8 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-navy-950/45 lg:bottom-10 lg:right-14">
        {sheet ?? label}
      </span>
    </div>
  );
}

export function Eyebrow({ theme, children }: { theme: "dark" | "light"; children: ReactNode }) {
  const light = theme === "light";
  return (
    <motion.p
      variants={fadeUp}
      className={
        "inline-flex items-center gap-2.5 rounded-full border px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] " +
        (light
          ? "border-navy-950/15 bg-navy-950/[0.04] text-navy-900"
          : "border-cyan/25 bg-cyan/5 text-cyan")
      }
    >
      <span
        aria-hidden
        className={
          "size-1.5 rounded-full " +
          (light ? "bg-gold" : "led bg-cyan shadow-[0_0_8px_var(--cyan)]")
        }
      />
      {children}
    </motion.p>
  );
}

export function Headline({
  theme,
  children,
  accent,
  as = "h2",
}: {
  theme: "dark" | "light";
  children: ReactNode;
  accent?: string;
  as?: "h1" | "h2";
}) {
  const Tag = as === "h1" ? motion.h1 : motion.h2;
  return (
    <Tag
      variants={fadeUp}
      className={
        "mt-6 max-w-3xl font-display text-[2rem] font-bold leading-[1.05] tracking-tight sm:text-[2.75rem] lg:text-[3.25rem] " +
        (theme === "light" ? "text-navy-950" : "text-foreground")
      }
    >
      {children}
      {accent ? (
        <>
          {" "}
          <span
            className={
              theme === "light"
                ? "text-gold"
                : "bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent"
            }
          >
            {accent}
          </span>
        </>
      ) : null}
    </Tag>
  );
}

export function Subhead({ theme, children }: { theme: "dark" | "light"; children: ReactNode }) {
  return (
    <motion.p
      variants={fadeUp}
      className={
        "mt-5 max-w-2xl text-[1rem] leading-relaxed " +
        (theme === "light" ? "text-navy-900/70" : "text-gray-mid")
      }
    >
      {children}
    </motion.p>
  );
}

export function BandHeader({
  theme,
  eyebrow,
  headline,
  accent,
  subhead,
  animateOnMount = false,
  as = "h2",
}: {
  theme: "dark" | "light";
  eyebrow: string;
  headline: string;
  accent?: string;
  subhead?: string;
  /** Use h1 for the page masthead. */
  as?: "h1" | "h2";
  /** The first band is already in view on load, so it plays immediately. */
  animateOnMount?: boolean;
}) {
  const motionProps = animateOnMount
    ? { animate: "show" as const }
    : { whileInView: "show" as const, viewport: { once: true, amount: 0.25 } };
  return (
    <motion.div variants={stagger} initial="hidden" {...motionProps}>
      <Eyebrow theme={theme}>{eyebrow}</Eyebrow>
      <Headline theme={theme} accent={accent} as={as}>
        {headline}
      </Headline>
      {subhead ? <Subhead theme={theme}>{subhead}</Subhead> : null}
    </motion.div>
  );
}
