import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/institutional/PublicPage";
import { BRAND } from "@/lib/brand";
import { PUBLIC_PAGES } from "@/lib/public-content";

const page = PUBLIC_PAGES["/future-skills"];

export const Route = createFileRoute("/future-skills")({
  head: () => ({
    meta: [
      { title: `${page.title} | ${BRAND.name}` },
      { name: "description", content: page.intro },
    ],
  }),
  component: FutureSkillsPage,
});

function FutureSkillsPage() {
  return <PublicPage page={page} />;
}
