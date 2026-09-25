import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/hero/Hero";

import { WhoWeAre } from "@/components/home/WhoWeAre";
import { CoreDomains } from "@/components/home/CoreDomains";
import { Programs } from "@/components/home/Programs";
import { InstructorCredibility } from "@/components/home/InstructorCredibility";
import { LiveActivity } from "@/components/home/LiveActivity";
import { ForSchools } from "@/components/home/ForSchools";
import { InstitutionalPartners } from "@/components/home/InstitutionalPartners";
import { FinalCTA } from "@/components/home/FinalCTA";
import { MissionRail } from "@/components/immersive/MissionRail";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AstroBot Academy — Robotics, AI & Space Science for Kids" },
      {
        name: "description",
        content:
          "An immersive Mission Control experience. Hands-on Robotics, AI and Space Science programs for pre-school to Grade 8 students across Pakistan.",
      },
      { property: "og:title", content: "AstroBot Academy — Robotics, AI & Space Science for Kids" },
      {
        property: "og:description",
        content:
          "An immersive Mission Control experience. Hands-on Robotics, AI and Space Science programs for pre-school to Grade 8 students across Pakistan.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      {/* Site-wide immersive space scene + telemetry live in the root layout.
          Only the local mission storyline is rendered here. */}

      {/* Bottom telemetry console — persistent, live scroll progress; fades at footer */}
      <MissionRail />

      {/* Mission storyline — Hero → Who We Are → Core Domains → Programs →
          Faculty → System Status → For Schools → Partners → Final CTA */}
      <div className="relative z-10 isolate transform-gpu">
        <Hero />
        <WhoWeAre />
        <CoreDomains />
        <Programs />
        <InstructorCredibility />
        <LiveActivity />
        <ForSchools />
        <InstitutionalPartners />
        <FinalCTA />
      </div>
    </>
  );
}
