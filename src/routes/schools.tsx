import { createFileRoute } from "@tanstack/react-router";
import {
  FsAssessment,
  FsCurriculumScale,
  FsDeliverySpec,
  FsExclusions,
  FsFramework,
  FsHero,
  FsKits,
  FsProofCta,
  FsRequirements,
  FsTraining,
} from "@/components/for-schools/sections";

export const Route = createFileRoute("/schools")({
  head: () => ({
    meta: [
      {
        title: "For Schools — A Timetabled Robotics, AI & Space Subject | AstroBot Academy",
      },
      {
        name: "description",
        content:
          "A formal weekly subject for ECE through Grade 8: 40 weeks, 36 non-repeating modules, kits, certified instructors and term-wise academic reporting, fully supplied.",
      },
      {
        property: "og:title",
        content: "For Schools — A Timetabled Robotics, AI & Space Subject | AstroBot Academy",
      },
      {
        property: "og:description",
        content:
          "40-minute weekly sessions built into your timetable — curriculum, kits, instructors and reporting supplied by AstroBot Academy.",
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
      <FsRequirements />
      <FsTraining />
      <FsExclusions />
      <FsProofCta />
    </div>
  );
}
