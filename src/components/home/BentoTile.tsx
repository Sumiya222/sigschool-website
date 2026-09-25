import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

type Accent = "indigo" | "cyan";

/**
 * Signature bento tile — a machined "double-bezel" enclosure: an outer shell
 * (hairline border + faint fill + padding) cradling an inner glass core with a
 * concentric radius and a top inner-highlight. Every homepage card is built
 * from this so the whole page reads as one hardware system.
 */
export function BentoTile({
  children,
  className,
  contentClassName,
  index = 0,
  accent = "indigo",
  interactive = true,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  index?: number;
  accent?: Accent;
  interactive?: boolean;
}) {
  const glow =
    accent === "cyan"
      ? "hover:border-cyan/45 hover:shadow-[0_22px_60px_-24px_color-mix(in_oklab,var(--cyan)_55%,transparent)]"
      : "hover:border-gold/50 hover:shadow-[0_22px_60px_-24px_color-mix(in_oklab,var(--gold)_55%,transparent)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay: (index % 4) * 0.07, ease }}
      className={cn(
        "group relative h-full rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-1.5 backdrop-blur-sm",
        "transition-[transform,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        interactive && "hover:-translate-y-1.5",
        interactive && glow,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-1.5 rounded-[1.25rem] opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          accent === "cyan"
            ? "[background:radial-gradient(420px_circle_at_80%_0%,color-mix(in_oklab,var(--cyan)_16%,transparent),transparent_60%)]"
            : "[background:radial-gradient(420px_circle_at_80%_0%,color-mix(in_oklab,var(--gold)_16%,transparent),transparent_60%)]",
        )}
      />
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-[1.25rem] bg-black/30 p-6 backdrop-blur-md shadow-[inset_0_1px_0_color-mix(in_oklab,var(--offwhite)_9%,transparent)] lg:p-7",
          contentClassName,
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}
