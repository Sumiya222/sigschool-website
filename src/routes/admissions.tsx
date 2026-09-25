import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * /admissions no longer exists — AstroBot does not enrol students directly.
 * Kept only as a permanent redirect so old links and bookmarks resolve.
 */
export const Route = createFileRoute("/admissions")({
  beforeLoad: () => {
    throw redirect({ to: "/programs", statusCode: 301 });
  },
});
