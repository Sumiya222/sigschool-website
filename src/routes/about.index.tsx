import { createFileRoute } from "@tanstack/react-router";
import { AboutOverviewPage } from "@/components/about/AboutExperience";

export const Route = createFileRoute("/about/")({ component: AboutOverviewPage });
