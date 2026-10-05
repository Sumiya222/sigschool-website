import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/institutional/PublicPage";
import { PUBLIC_PAGES } from "@/lib/public-content";
export const Route = createFileRoute("/students")({ component: Page });
function Page() {
  return <PublicPage page={PUBLIC_PAGES["/student-life"]} />;
}
