import { BRAND } from "@/lib/brand";
import crest from "@/assets/signature-school-crest.png";

/** Text-only holding wordmark. Approved official logo artwork is still required. */
export function Logo({
  variant = "light",
  className,
  withWordmark = true,
}: {
  variant?: "light" | "dark";
  className?: string;
  withWordmark?: boolean;
}) {
  const ink = variant === "light" ? "#ffffff" : "#0A1B3D";
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`} style={{ color: ink }}>
      <img src={crest} alt="" aria-hidden="true" className="size-10 object-contain" />
      {withWordmark && (
        <span className="leading-none">
          <span className="block font-display text-base font-bold uppercase tracking-[0.08em]">
            {BRAND.name}
          </span>
          <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-[0.28em] text-gold-bright">
            {BRAND.tagline}
          </span>
        </span>
      )}
    </span>
  );
}
