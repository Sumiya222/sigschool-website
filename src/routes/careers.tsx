import { createFileRoute } from "@tanstack/react-router";
import { CrApply, CrClosing, CrHero, CrRoles, CrWhy } from "@/components/careers/sections";
import { getJobOpenings } from "@/lib/careers.functions";

const TITLE = "Careers — AstroBot Academy";
const DESCRIPTION =
  "Open roles at AstroBot Academy for engineers, researchers and educators delivering robotics, AI and space science inside partner schools.";

export const Route = createFileRoute("/careers")({
  loader: async () => ({ roles: await getJobOpenings() }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center text-foreground">
      <h1 className="font-display text-2xl font-bold">This page could not be loaded.</h1>
      <p className="mt-3 text-gray-mid">Please refresh, or try again in a moment.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center text-foreground">
      <h1 className="font-display text-2xl font-bold">Page not found.</h1>
    </div>
  ),
  component: CareersPage,
});

function CareersPage() {
  const { roles } = Route.useLoaderData();
  return (
    <div className="relative z-10 isolate transform-gpu">
      <CrHero />
      <CrWhy />
      <CrRoles roles={roles} />
      <CrApply roles={roles} />
      <CrClosing />
    </div>
  );
}
