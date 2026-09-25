import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "super";

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={`dash-badge dash-badge--${tone} ${className}`.trim()}>{children}</span>;
}

/** Map a whitelist/user status string to a Badge tone. */
export function statusTone(status: string): BadgeTone {
  const s = status.toLowerCase();
  if (s === "approved" || s === "active" || s === "paid" || s === "present") return "success";
  if (s === "pending" || s === "partially_paid" || s === "partial" || s === "late")
    return "warning";
  if (s === "revoked" || s === "inactive" || s === "absent" || s === "overdue" || s === "unpaid")
    return "danger";
  return "neutral";
}

/** Pretty-print a status token for display. */
export function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
