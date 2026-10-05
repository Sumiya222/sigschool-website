import { createFileRoute } from "@tanstack/react-router";
import { NewsDetailPage } from "@/components/about/AboutExperience";
import { getNewsArticle } from "@/data/newsData";
export const Route = createFileRoute("/news-events/$slug")({ component: Page });
function Page() {
  const { slug } = Route.useParams();
  return <NewsDetailPage article={getNewsArticle(slug)} />;
}
