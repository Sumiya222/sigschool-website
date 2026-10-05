import { createFileRoute } from "@tanstack/react-router";
import { NoticesPage } from "@/components/about/AboutExperience";

export const Route = createFileRoute("/about/notices/")({ component: NoticesPage });
