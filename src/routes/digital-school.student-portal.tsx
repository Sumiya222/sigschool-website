import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/institutional/PublicPage";
import { PUBLIC_PAGES } from "@/lib/public-content";
import { BRAND } from "@/lib/brand";
const page = PUBLIC_PAGES["/digital-school/student-portal"];
export const Route = createFileRoute("/digital-school/student-portal")({
  head: () => ({
    meta: [
      { title: page.title + " | " + BRAND.name },
      { name: "description", content: page.intro },
    ],
  }),
  component: Page,
});
function Page() {
  return <PublicPage page={page} />;
}
