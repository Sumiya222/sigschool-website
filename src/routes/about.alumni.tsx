import { createFileRoute } from "@tanstack/react-router";
import { AlumniPage } from "@/components/about/AboutExperience";
export const Route = createFileRoute("/about/alumni")({ component: AlumniPage });
