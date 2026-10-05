import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about/notices")({ component: NoticesLayout });

function NoticesLayout() {
  return <Outlet />;
}
