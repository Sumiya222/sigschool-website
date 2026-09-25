import { createFileRoute } from "@tanstack/react-router";
import {
  PrAgeTracks,
  PrCampBanner,
  PrClosingCta,
  PrCurriculumScale,
  PrFourPrograms,
  PrHero,
  PrSessionShape,
  PrStudentBuilds,
} from "@/components/programs/sections";

export const Route = createFileRoute("/programs")({
  head: () => ({
    meta: [
      { title: "Programs — Boot Camps, Workshops & School Curriculum | AstroBot Academy" },
      {
        name: "description",
        content:
          "Summer and Winter Boot Camps, standalone Workshops and a year-round school curriculum in Robotics, AI and Space Science for ages 5 to 17.",
      },
      {
        property: "og:title",
        content: "Programs — Boot Camps, Workshops & School Curriculum | AstroBot Academy",
      },
      {
        property: "og:description",
        content:
          "Three public programs for families plus a timetabled year-round subject for partner schools — Robotics, AI and Space Science.",
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
      <PrCampBanner />
      <PrFourPrograms />
      <PrAgeTracks />
      <PrSessionShape />
      <PrStudentBuilds />
      <PrCurriculumScale />
      <PrClosingCta />
    </div>
  );
}
