import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/news-events")({ component: NewsEventsLayout });

function NewsEventsLayout() {
  return <Outlet />;
}
