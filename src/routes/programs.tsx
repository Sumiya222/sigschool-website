import { createFileRoute } from "@tanstack/react-router";
import {
  PrAgeTracks,
  PrClosingCta,
  PrCurriculumScale,
  PrFourPrograms,
  PrHero,
  PrSessionShape,
} from "@/components/programs/sections";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: `Academics | ${BRAND.name}` },
      {
        name: "description",
        content: `A K-12 curriculum spanning Lower, Middle and Upper School — how ${BRAND.shortName} structures classes, projects and academic growth from kindergarten through grade 12.`,
      },
      {
        property: "og:title",
        content: `Academics | ${BRAND.name}`,
      },
      {
        property: "og:description",
        content: `Grade-by-grade academics across Lower School, Middle School and Upper School at ${BRAND.shortName}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgramsPage,
});

function ProgramsPage() {
  return (
    <div className="relative z-10 isolate transform-gpu">
      <PrHero />
      <PrFourPrograms />
      <PrAgeTracks />
      <PrSessionShape />
      <PrCurriculumScale />
      <PrClosingCta />
    </div>
  );
}
