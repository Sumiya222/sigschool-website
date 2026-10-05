import { createFileRoute } from "@tanstack/react-router";
import { ChairpersonPage } from "@/components/about/AboutExperience";
export const Route = createFileRoute("/about/chairperson")({ component: ChairpersonPage });
