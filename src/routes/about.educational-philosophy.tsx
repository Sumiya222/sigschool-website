import { createFileRoute } from "@tanstack/react-router";
import { EducationalPhilosophyPage } from "@/components/about/AboutExperience";

export const Route = createFileRoute("/about/educational-philosophy")({
  component: EducationalPhilosophyPage,
});
