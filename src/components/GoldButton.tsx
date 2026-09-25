import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

// Exported so a wrapping <a>/<Link> can render an anchor with this exact
// look instead of nesting a real <button> inside it — nesting interactive
// elements is invalid HTML and causes a hydration mismatch (browsers
// re-parse the invalid nesting differently than React's virtual DOM).
export const goldButtonClassName = cn(
  // Base: fully-rounded pill, indigo→brighter-indigo gradient, subtle rim light.
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-br from-gold to-gold-bright px-7 py-3 font-display text-small font-semibold text-offwhite ring-1 ring-inset ring-white/15",
  "shadow-[0_6px_24px_-8px_color-mix(in_oklab,var(--gold)_65%,transparent)]",
  "transition-[transform,box-shadow,filter] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
  // Hover: lift, brighten, cyan-tinted glow.
  "hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_36px_-8px_color-mix(in_oklab,var(--cyan)_55%,transparent)]",
  "active:translate-y-0 active:scale-[0.97]",
  "disabled:pointer-events-none disabled:opacity-60",
);

export const GoldButtonSheen = (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
  />
);

export const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ className, children, loading = false, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(goldButtonClassName, className)}
        {...props}
      >
        {GoldButtonSheen}
        {loading && (
          <span
            aria-hidden="true"
            className="relative size-4 animate-spin rounded-full border-2 border-offwhite/30 border-t-offwhite"
          />
        )}
        {loading && <span className="sr-only">Loading</span>}
        <span className="relative inline-flex items-center gap-2">{children}</span>
      </button>
    );
  },
);
GoldButton.displayName = "GoldButton";
