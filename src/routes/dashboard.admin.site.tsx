import { createFileRoute, redirect } from "@tanstack/react-router";

// The Site Control Panel is now the CMS, at /dashboard/cms.
export const Route = createFileRoute("/dashboard/admin/site")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/cms", search: { view: "page:home" } });
  },
});
