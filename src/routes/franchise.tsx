import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PUBLIC_PAGES } from "@/lib/public-content";
import { BRAND } from "@/lib/brand";
const page = PUBLIC_PAGES["/franchise"];
export const Route = createFileRoute("/franchise")({
  head: () => ({
    meta: [
      { title: page.title + " | " + BRAND.name },
      { name: "description", content: page.intro },
    ],
  }),
  component: FranchiseLayout,
});
function FranchiseLayout() {
  return <Outlet />;
}
