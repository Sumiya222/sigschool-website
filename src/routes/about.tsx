import { createFileRoute } from "@tanstack/react-router";
import {
  AbClosingCta,
  AbEcosystem,
  AbHero,
  AbHowWeTeach,
  AbLeadership,
  AbPositioning,
  AbRegionalReach,
  AbVisionMission,
} from "@/components/about/sections";

const TITLE = "About — AstroBot Academy";
const DESCRIPTION =
  "AstroBot Academy operates under the Stellar Scholar Space Education Initiative, backed by Stelalliance (SMC-Private) Ltd — an academic delivery platform for Robotics, AI and Space Science.";

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
      <AbRegionalReach />
      <AbClosingCta />
    </>
  );
}
