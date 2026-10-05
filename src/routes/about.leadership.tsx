import { createFileRoute } from "@tanstack/react-router";
import { LeadershipPage } from "@/components/about/AboutExperience";

export const Route = createFileRoute("/about/leadership")({ component: LeadershipPage });
