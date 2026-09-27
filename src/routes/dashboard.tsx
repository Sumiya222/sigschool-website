import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";

/**
 * Routes under /dashboard that must stay reachable without a session.
 * Every other /dashboard/* path is gated here as a baseline backstop — the
 * real, role-specific gating still lives in each section's own layout
 * (useRequireRole/useRequireAnyRole), but this means a future route added
 * outside those four layouts fails closed (redirected to login) instead of
 * shipping completely unguarded by omission.
 */
const PUBLIC_DASHBOARD_PATHS = new Set([
  "/dashboard",
  "/dashboard/login",
  "/dashboard/signup",
  "/dashboard/forgot-password",
  "/dashboard/reset-password",
]);

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (PUBLIC_DASHBOARD_PATHS.has(location.pathname)) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/dashboard/login" });
    }
  },
  head: () => ({
    meta: [
      { title: `Dashboard — ${BRAND.name}` },
      // Intentionally hardcoded, not read from src/lib/site-config.ts's
      // SITE_INDEXABLE — Mission Control stays noindexed permanently, even
      // after that flag flips true for real launch.
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="dashboard-blueprint antialiased">
      <Outlet />
    </div>
  );
}
