import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Exported so a wrapping <a>/<Link> can render an anchor with this exact
// look instead of nesting a real <button> inside it — see the identical
// note on GoldButton's goldButtonClassName for why that nesting is invalid
// HTML and causes a hydration mismatch.
export const ghostButtonClassName = cn(
  // Base: pill outline, faint indigo tint, matches the primary shape.
  "group relative inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/5 px-7 py-3 font-display text-small font-semibold text-gold-bright backdrop-blur-sm",
  "transition-[transform,box-shadow,border-color,background-color,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
  // Hover: lift, brighten border/fill, soft glow.
  "hover:-translate-y-0.5 hover:border-gold hover:bg-gold/15 hover:text-offwhite hover:shadow-[0_10px_30px_-10px_color-mix(in_oklab,var(--gold)_60%,transparent)]",
  "active:translate-y-0 active:scale-[0.97]",
  "disabled:pointer-events-none disabled:opacity-60",
);

export const GhostButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(ghostButtonClassName, className)} {...props}>
        {children}
      </button>
    );
  },
);
GhostButton.displayName = "GhostButton";
