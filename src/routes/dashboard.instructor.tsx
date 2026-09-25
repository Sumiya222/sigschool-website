import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useRequireRole } from "@/lib/dashboard-auth";
import { DashboardShell, DashboardLoading } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/instructor")({
  component: InstructorLayout,
});

function InstructorLayout() {
  const state = useRequireRole("instructor");
  if (state.status !== "ready") return <DashboardLoading />;
  return (
    <DashboardShell
      title="Instructor portal"
      email={state.session.email}
      fullName={state.session.fullName}
      roleLabel="Instructor"
      nav={[{ to: "/dashboard/instructor", label: "My sections" }]}
    >
      <Outlet />
    </DashboardShell>
  );
}
