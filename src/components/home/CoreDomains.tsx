import { motion } from "framer-motion";
import { DomainShowcase } from "@/components/programs/DomainShowcase";
import { useSection, str } from "@/lib/site-content";

const ease = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

export function CoreDomains() {
  const c = useSection("core_domains");
  const eyebrow = str(c, "eyebrow", "Core Domains");
  const headline = str(c, "headline", "Three Disciplines.");
  const headlineGradient = str(c, "headline_gradient", "One Interconnected System.");
  const subhead = str(
    c,
    "subhead",
    "Every session moves through Concept → Exploration → Project Execution.",
  );

  return (
    <section
      aria-label="Core learning domains"
      className="relative w-full bg-transparent pt-20 lg:pt-28"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={fadeUp}
            className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-cyan/25 bg-cyan/5 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan"
          >
            <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            {eyebrow}
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="mt-5 font-display text-[2.1rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]"
          >
            {headline}
            <br />
            <span className="bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
              {headlineGradient}
            </span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-[1.02rem] leading-relaxed text-gray-mid"
          >
            {subhead}
          </motion.p>
        </motion.div>
      </div>

      {/* Reuse the same interactive showcase from /programs.
          `header={null}` hides its internal header so ours above is the only one.
          `exploreVariant="navigate"` sends the Explore button to /programs. */}
      <DomainShowcase
        header={null}
        exploreVariant="navigate"
        className="pt-6 pb-20 lg:pt-10 lg:pb-28"
      />
    </section>
  );
}
