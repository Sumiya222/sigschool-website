import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Users,
  GraduationCap,
  ArrowUpNarrowWide,
  CalendarRange,
  CalendarDays,
  ReceiptText,
  Inbox,
  Globe,
  ScrollText,
} from "lucide-react";
import { useRequireRole } from "@/lib/dashboard-auth";
import { isHardcodedSuperAdmin } from "@/lib/super-admin";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, DashboardLoading } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/admin")({
  component: AdminLayout,
});

const NAV = [
  { to: "/dashboard/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/admin/whitelist", label: "Whitelist", icon: ShieldCheck },
  { to: "/dashboard/admin/schools", label: "Schools", icon: Building2 },
  { to: "/dashboard/admin/instructors", label: "Instructors", icon: Users },
  { to: "/dashboard/admin/students", label: "Students", icon: GraduationCap },
  { to: "/dashboard/admin/sessions", label: "Session Calendar", icon: CalendarDays },
  { to: "/dashboard/admin/promotion", label: "Promotion", icon: ArrowUpNarrowWide },
  { to: "/dashboard/admin/terms", label: "Terms", icon: CalendarRange },
  { to: "/dashboard/admin/invoices", label: "Invoices", icon: ReceiptText },
  { to: "/dashboard/admin/submissions", label: "Form Submissions", icon: Inbox },
  { to: "/dashboard/admin/audit-log", label: "Audit Log", icon: ScrollText },
];

// Website editing lives in the CMS. Only the Super Admin holds both roles.
const CMS_LINK = { to: "/dashboard/cms", label: "CMS", icon: Globe };

/** Polled every 60s so the sidebar badge stays roughly live without a
 * dedicated realtime subscription. */
function useUnopenedSubmissionsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [inquiries, applications, registrations] = await Promise.all([
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        // Registrations track "opened" separately from status — status is a real
        // confirmed/waitlisted/cancelled decision, not a read flag.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("registrations" as any) as any)
          .select("id", { count: "exact", head: true })
          .is("opened_at", null),
      ]);
      if (cancelled) return;
      setCount((inquiries.count ?? 0) + (applications.count ?? 0) + (registrations.count ?? 0));
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}

function AdminLayout() {
  const state = useRequireRole("admin");
  const unopened = useUnopenedSubmissionsCount();
  if (state.status !== "ready") return <DashboardLoading />;
  const navWithBadges = NAV.map((item) =>
    item.to === "/dashboard/admin/submissions" ? { ...item, badge: unopened } : item,
  );
  const nav = isHardcodedSuperAdmin(state.session.email)
    ? [...navWithBadges, CMS_LINK]
    : navWithBadges;
  return (
    <DashboardShell
      title="Admin console"
      email={state.session.email}
      fullName={state.session.fullName}
      roleLabel="Admin"
      nav={nav}
    >
      <Outlet />
    </DashboardShell>
  );
}
