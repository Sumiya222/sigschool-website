import { createFileRoute } from "@tanstack/react-router";
import {
  AbClosingCta,
  AbEcosystem,
  AbHero,
  AbHowWeTeach,
  AbLeadership,
  AbPositioning,
  AbVisionMission,
} from "@/components/about/sections";
import { BRAND } from "@/lib/brand";

const TITLE = `About — ${BRAND.name}`;
const DESCRIPTION = `${BRAND.name} is a mission-driven K-12 private school serving students from ${BRAND.divisions[0].range} through ${BRAND.divisions[2].range}, built on rigorous academics, character, and a close-knit school community.`;

export const Route = createFileRoute("/about")({
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
  component: AboutPage,
});

function AboutPage() {
  return (
    <>
      <AbHero />
      <AbPositioning />
      <AbVisionMission />
      <AbEcosystem />
      <AbHowWeTeach />
      <AbLeadership />
      <AbClosingCta />
    </>
  );
}
