import { createFileRoute } from "@tanstack/react-router";
import { NewsListingPage } from "@/components/about/AboutExperience";
export const Route = createFileRoute("/about/news-events")({ component: NewsListingPage });
