import { createFileRoute } from "@tanstack/react-router";
import {
  AdHero,
  AdProcess,
  AdTimeline,
  AdDivisions,
  AdTuition,
  AdCta,
} from "@/components/admissions/sections";
import { BRAND } from "@/lib/brand";

const TITLE = `Admissions — ${BRAND.name}`;
const DESCRIPTION = `Learn how to apply to ${BRAND.name}. Explore our admissions process, timeline, requirements by division, and tuition & financial aid for Lower, Middle, and Upper School.`;

export const Route = createFileRoute("/admissions")({
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
  component: AdmissionsPage,
});

function AdmissionsPage() {
  return (
    <div className="relative z-10 isolate transform-gpu">
      <AdHero />
      <AdProcess />
      <AdTimeline />
      <AdDivisions />
      <AdTuition />
      <AdCta />
    </div>
  );
}
