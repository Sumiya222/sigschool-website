import { createFileRoute, redirect } from "@tanstack/react-router";

/** Renamed to /schools. Permanent redirect so old links and bookmarks resolve. */
export const Route = createFileRoute("/for-schools")({
  beforeLoad: () => {
    throw redirect({ to: "/schools", statusCode: 301 });
  },
});
