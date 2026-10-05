import { createFileRoute } from "@tanstack/react-router";
import { OurStoryPage } from "@/components/about/AboutExperience";

export const Route = createFileRoute("/about/our-story")({ component: OurStoryPage });
