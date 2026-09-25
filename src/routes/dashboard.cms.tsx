import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useRequireRole } from "@/lib/dashboard-auth";
import { DashboardShell, DashboardLoading } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/cms")({
  component: CmsLayout,
});

function CmsLayout() {
  const state = useRequireRole("cms");
  if (state.status !== "ready") return <DashboardLoading />;
  return (
    <DashboardShell
      title="CMS"
      email={state.session.email}
      fullName={state.session.fullName}
      roleLabel="CMS"
      nav={[]}
      focusRoutes={["/dashboard/cms"]}
    >
      <Outlet />
    </DashboardShell>
  );
}
