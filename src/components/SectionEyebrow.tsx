import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionEyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-3 font-display text-small font-semibold uppercase tracking-[0.2em] text-gold",
        className,
      )}
    >
      {children}
    </p>
  );
}
