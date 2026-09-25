import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useSiteContent } from "@/lib/site-content";
import { useCampRegistration } from "@/components/camp/CampRegistrationProvider";

/**
 * Site-wide camp strip.
 *
 * It shares the camp window's single `is_open` toggle — there is no separate
 * switch. The bar is fixed above the nav and publishes its height as
 * `--announce-h`, which the nav and the page content read so nothing overlaps.
 */

const BAR_HEIGHT = 44;

function dismissKey(campName: string) {
  // Keyed to the camp, so a NEW camp reappears for someone who dismissed the last.
  return `astrobot:camp-bar:${campName}`;
}

export function CampAnnouncementBar() {
  const camp = useSiteContent().campWindow;
  const { open, canRegister } = useCampRegistration();
  const [dismissed, setDismissed] = useState(true);

  const visible = !!camp?.is_open;
  const name = camp?.camp_name ?? "";

  useEffect(() => {
    if (!visible) return setDismissed(true);
    try {
      setDismissed(window.localStorage.getItem(dismissKey(name)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [visible, name]);

  const showing = visible && !dismissed;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--announce-h", showing ? `${BAR_HEIGHT}px` : "0px");
    return () => root.style.setProperty("--announce-h", "0px");
  }, [showing]);

  if (!showing || !camp) return null;

  const full = !!camp.is_full;
  const ctaLabel = full ? "Waitlist open" : camp.register_label || "Register";

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(dismissKey(name), "1");
    } catch {
      /* private mode — the bar simply returns next visit */
    }
  }

  const cta =
    camp.registration_mode === "built_in" && canRegister ? (
      <button
        type="button"
        onClick={open}
        className="rounded-full bg-gold px-3.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-navy-950 transition hover:brightness-110"
      >
        {ctaLabel}
      </button>
    ) : camp.registration_mode === "external" && camp.register_url ? (
      <a
        href={camp.register_url}
        target="_blank"
        rel="noreferrer"
        className="rounded-full bg-gold px-3.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-navy-950 transition hover:brightness-110"
      >
        {ctaLabel}
      </a>
    ) : (
      <Link
        to="/programs"
        className="rounded-full border border-gold/50 px-3.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-gold transition hover:bg-gold/10"
      >
        Details soon
      </Link>
    );

  return (
    <div
      role="region"
      aria-label="Camp announcement"
      style={{ height: BAR_HEIGHT }}
      className="fixed inset-x-0 top-0 z-[60] border-b border-gold/25 bg-[#171a3a]/95 backdrop-blur-md"
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]"
        />
        <p className="min-w-0 flex-1 truncate text-[0.8rem] text-foreground">
          <span className="font-semibold">{camp.camp_name}</span>
          {camp.dates_label ? <span className="text-gray-mid"> · {camp.dates_label}</span> : null}
          {full ? <span className="text-gray-mid"> · Capacity reached</span> : null}
        </p>
        {cta}
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-gray-mid transition hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Dismiss announcement</span>
        </button>
      </div>
    </div>
  );
}
