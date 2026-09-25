import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/**
 * Shared full-screen lightbox shell.
 *
 * Owns every interaction the Students page lightboxes have in common:
 * portal to the body (the page sits inside a `transform-gpu` wrapper, which
 * would otherwise anchor `fixed` to that element), keyboard arrows and
 * Escape, previous/next affordances, click-outside-to-close and the close
 * button. Callers supply only the content of the panel.
 */
export function LightboxShell({
  index,
  count,
  onIndex,
  onClose,
  label,
  prevLabel = "Previous",
  nextLabel = "Next",
  contentKey,
  children,
}: {
  index: number | null;
  count: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  label: string;
  prevLabel?: string;
  nextLabel?: string;
  contentKey: string;
  children: ReactNode;
}) {
  const open = index !== null;

  const step = useCallback(
    (delta: number) => {
      if (index === null || count === 0) return;
      onIndex((index + delta + count) % count);
    },
    [index, count, onIndex],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, step]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={onClose}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm sm:p-8"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/50 p-2.5 text-white/80 transition hover:border-cyan/60 hover:text-cyan"
          >
            <X className="size-4" aria-hidden />
          </button>

          {count > 1 ? (
            <>
              <ArrowBtn side="left" label={prevLabel} onClick={() => step(-1)} />
              <ArrowBtn side="right" label={nextLabel} onClick={() => step(1)} />
            </>
          ) : null}

          <motion.div
            key={contentKey}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-4xl flex-col items-center gap-4 overflow-y-auto"
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function ArrowBtn({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-3 text-white/80 transition hover:border-cyan/60 hover:text-cyan ${
        side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6"
      }`}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

/* ── Cross-section bridge ──────────────────────────────────────────────────
   The Featured Students lightbox needs to hand a visitor to the Build Log
   gallery further up the page. A tiny event avoids threading state through
   the whole route for a single link. */

export const OPEN_PROJECT_EVENT = "astrobot:open-project";

export function requestOpenProject(projectId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_PROJECT_EVENT, { detail: projectId }));
}

export function useOpenProjectRequest(handler: (projectId: string) => void) {
  useEffect(() => {
    const on = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (typeof id === "string") handler(id);
    };
    window.addEventListener(OPEN_PROJECT_EVENT, on);
    return () => window.removeEventListener(OPEN_PROJECT_EVENT, on);
  }, [handler]);
}
