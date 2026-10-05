import { createFileRoute } from "@tanstack/react-router";
import { AcademicsPage } from "@/components/institutional/ReferenceAcademicPages";
import { BRAND } from "@/lib/brand";
export const Route = createFileRoute("/academics")({
  head: () => ({
    meta: [
      { title: "Academics | " + BRAND.name },
      {
        name: "description",
        content: "Building strong foundations for a future-ready generation.",
      },
    ],
  }),
  component: Page,
});
function Page() {
  return <AcademicsPage />;
}
