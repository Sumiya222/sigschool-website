import { createFileRoute, redirect } from "@tanstack/react-router";

/** /partners was retired — partner information lives on /about. */
export const Route = createFileRoute("/partners")({
  beforeLoad: () => {
    throw redirect({ to: "/about", statusCode: 301 });
  },
});
