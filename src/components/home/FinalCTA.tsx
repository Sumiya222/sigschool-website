import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { ghostButtonClassName } from "@/components/GhostButton";
import { setting, str, useSection, useSiteContent } from "@/lib/site-content";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};

/**
 * FinalCTA — the closing beat of the Home page. Transparent background so the
 * persistent planet/starfield reads clearly one last time before the footer.
 * Content is wrapped in the same glass HUD panel treatment used across the
 * page (bg-black/30, backdrop-blur, cyan border, corner brackets) so it lands
 * as one final mission-control display rather than bare text on the scene.
 * No pricing anywhere — every CTA routes to an inquiry, never a checkout.
 */
export function FinalCTA() {
  const { settings } = useSiteContent();
  const c = useSection("final_cta");

  return (
    <section
      aria-label="Visit or apply to Northbridge Preparatory School"
      className="relative w-full py-24 sm:py-28"
    >
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.35 }}
          className="relative rounded-2xl border border-cyan/15 bg-black/30 px-6 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md sm:px-10 sm:py-14"
        >
          {/* Corner brackets — HUD display frame (matches other panels) */}
          <span aria-hidden className="hud-bracket left-2 top-2 border-l border-t opacity-60" />
          <span aria-hidden className="hud-bracket right-2 top-2 border-r border-t opacity-60" />
          <span aria-hidden className="hud-bracket bottom-2 left-2 border-b border-l opacity-60" />
          <span aria-hidden className="hud-bracket bottom-2 right-2 border-b border-r opacity-60" />

          <motion.p
            variants={fadeUp}
            className="mx-auto inline-flex items-center gap-2.5 rounded-full border border-cyan/25 bg-cyan/5 px-3 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-cyan"
          >
            <span className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
            {str(c, "eyebrow", "Ready When You Are")}
          </motion.p>

          <motion.h2
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl font-display text-[2.1rem] font-bold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]"
          >
            {str(c, "headline", "Your Child's Next Chapter ")}
            <span className="text-cosmic">{str(c, "headline_gradient", "Starts Here.")}</span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-body leading-relaxed text-gray-mid"
          >
            {str(
              c,
              "subhead",
              "Schedule a tour, meet our faculty, and see our classrooms in action — admissions details shared without the runaround.",
            )}
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          >
            <Link
              to={str(c, "primary_cta_target", "/admissions")}
              className={cn(goldButtonClassName, "w-full sm:w-auto")}
            >
              {GoldButtonSheen}
              <span className="relative inline-flex items-center gap-2">
                {str(c, "primary_cta_label", "Apply Now")}
              </span>
            </Link>
            <Link
              to={str(c, "secondary_cta_target", "/contact")}
              className={cn(ghostButtonClassName, "w-full sm:w-auto")}
            >
              {str(c, "secondary_cta_label", "Schedule a Visit")}
            </Link>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-7 flex items-center justify-center gap-2 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-gray-mid/70"
          >
            <span className="led size-1.5 rounded-full bg-cyan/80 shadow-[0_0_8px_var(--cyan)]" />
            {setting(settings, "response_time_note", "Typical Response Time: 24 Hours")}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
