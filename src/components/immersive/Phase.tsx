import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * Mission "phase" section wrapper. Provides the shared console eyebrow —
 * PHASE 0X // LABEL with a live status LED — plus a cinematic title/lead
 * reveal. This is the connective tissue that makes every section read as one
 * continuous Mission Control storyline.
 */
export function Phase({
  id,
  code,
  label,
  status = "NOMINAL",
  title,
  lead,
  align = "left",
  children,
  className,
}: {
  id?: string;
  code: string;
  label: string;
  status?: string;
  title: ReactNode;
  lead?: string;
  align?: "left" | "center";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("relative py-24 sm:py-28 lg:py-32", className)}>
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
            className={cn("flex items-center gap-3", align === "center" && "justify-center")}
          >
            <span className="telemetry text-cyan">PHASE {code}</span>
            <span aria-hidden className="h-px w-8 bg-cyan/40" />
            <span className="telemetry text-gray-mid">{label}</span>
            <span className="ml-1 inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]"
              />
              <span className="telemetry text-cyan/80">{status}</span>
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease, delay: 0.08 }}
            className="mt-5 font-display text-[2rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-heading lg:text-display"
          >
            {title}
          </motion.h2>

          {lead && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease, delay: 0.16 }}
              className={cn(
                "mt-5 text-body leading-relaxed text-gray-mid",
                align === "center" && "mx-auto",
              )}
            >
              {lead}
            </motion.p>
          )}
        </div>

        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}
