import { createFileRoute } from "@tanstack/react-router";
import { NewsListingPage } from "@/components/about/AboutExperience";

export const Route = createFileRoute("/news-events/")({ component: NewsListingPage });
