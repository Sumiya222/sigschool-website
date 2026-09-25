import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useRequireRole } from "@/lib/dashboard-auth";
import { DashboardShell, DashboardLoading } from "@/components/dashboard/DashboardShell";
import { SchoolSessionContext } from "@/lib/school-context";

export const Route = createFileRoute("/dashboard/school")({
  component: SchoolLayout,
});

function SchoolLayout() {
  const state = useRequireRole("school");
  if (state.status !== "ready") return <DashboardLoading />;
  return (
    <SchoolSessionContext.Provider value={state.session}>
      <DashboardShell
        title="School portal"
        email={state.session.email}
        fullName={state.session.fullName}
        roleLabel="School"
        nav={[
          { to: "/dashboard/school", label: "Overview" },
          { to: "/dashboard/school/summary", label: "School-wide summary" },
          { to: "/dashboard/school/invoices", label: "Invoices" },
        ]}
      >
        <Outlet />
      </DashboardShell>
    </SchoolSessionContext.Provider>
  );
}
