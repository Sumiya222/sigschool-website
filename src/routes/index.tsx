import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/hero/Hero";

import { WhoWeAre } from "@/components/home/WhoWeAre";
import { CoreDomains } from "@/components/home/CoreDomains";
import { Programs } from "@/components/home/Programs";
import { InstructorCredibility } from "@/components/home/InstructorCredibility";
import { LiveActivity } from "@/components/home/LiveActivity";
import { ForSchools } from "@/components/home/ForSchools";
import { FinalCTA } from "@/components/home/FinalCTA";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${BRAND.name} — ${BRAND.tagline}` },
      {
        name: "description",
        content: `${BRAND.name} is a K-12 private school offering a full Lower, Middle and Upper School program built around academic rigor, character and community.`,
      },
      { property: "og:title", content: `${BRAND.name} — ${BRAND.tagline}` },
      {
        property: "og:description",
        content: `A K-12 private school offering a full Lower, Middle and Upper School program built around academic rigor, character and community.`,
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="relative z-10 isolate transform-gpu">
      <Hero />
      <WhoWeAre />
      <CoreDomains />
      <Programs />
      <InstructorCredibility />
      <LiveActivity />
      <ForSchools />
      <FinalCTA />
    </div>
  );
}
