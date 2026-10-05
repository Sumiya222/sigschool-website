import { createFileRoute } from "@tanstack/react-router";
import { VisionMissionPage } from "@/components/about/AboutExperience";
export const Route = createFileRoute("/about/vision-mission")({ component: VisionMissionPage });
