import { BRAND } from "@/lib/brand";

// Placeholder brand mark: a simple shield monogram, swappable for a real
// logo file later without touching every import site (see src/lib/brand.ts).
export function Logo({
  variant = "light",
  className,
  withWordmark = true,
}: {
  variant?: "light" | "dark";
  className?: string;
  withWordmark?: boolean;
}) {
  const ink = variant === "light" ? "#f7f5f0" : "#1b2a4a";
  const accent = "#b08d57";

  return (
    <span className={"inline-flex items-center gap-2.5 " + (className ?? "")}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M17 2 L31 7.5 V17 C31 24.5 25 30 17 32 C9 30 3 24.5 3 17 V7.5 Z"
          stroke={ink}
          strokeWidth="1.6"
          fill="none"
        />
        <path d="M17 8 L17 26" stroke={accent} strokeWidth="1.6" />
        <path d="M11 12 L23 12" stroke={accent} strokeWidth="1.6" />
        <path d="M11 22 L23 22" stroke={accent} strokeWidth="1.6" />
      </svg>
      {withWordmark && (
        <span
          className="font-display text-lg font-semibold leading-none tracking-tight"
          style={{ color: ink }}
        >
          {BRAND.shortName}
        </span>
      )}
    </span>
  );
}
