import { createFileRoute, redirect } from "@tanstack/react-router";

/** Renamed to /students. Permanent redirect so old links and bookmarks resolve. */
export const Route = createFileRoute("/projects")({
  beforeLoad: () => {
    throw redirect({ to: "/students", statusCode: 301 });
  },
});
