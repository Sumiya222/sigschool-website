import { createFileRoute } from "@tanstack/react-router";
import {
  FsAssessment,
  FsCurriculumScale,
  FsDeliverySpec,
  FsFramework,
  FsHero,
  FsKits,
  FsProofCta,
} from "@/components/for-schools/sections";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: [
      {
        title: `Campus Life | ${BRAND.name}`,
      },
      {
        name: "description",
        content:
          "What daily life is like at " +
          BRAND.name +
          ": the daily schedule, facilities, clubs and activities, and how we keep families in the loop on their student's progress.",
      },
      {
        property: "og:title",
        content: `Campus Life | ${BRAND.name}`,
      },
      {
        property: "og:description",
        content:
          "A look at a day on campus — schedule, facilities, activities, and how we report on student progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForSchoolsPage,
});

function ForSchoolsPage() {
  return (
    <div className="relative z-10 isolate transform-gpu">
      <FsHero />
      <FsDeliverySpec />
      <FsFramework />
      <FsCurriculumScale />
      <FsKits />
      <FsAssessment />
      <FsProofCta />
    </div>
  );
}
