import { createFileRoute } from "@tanstack/react-router";
import { AtAGlancePage } from "@/components/about/AboutExperience";
export const Route = createFileRoute("/about/at-a-glance")({ component: AtAGlancePage });
