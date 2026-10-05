import { createFileRoute } from "@tanstack/react-router";
import { ExaminationsPage } from "@/components/institutional/ReferenceAcademicPages";
import { BRAND } from "@/lib/brand";
export const Route = createFileRoute("/examinations")({
  head: () => ({
    meta: [
      { title: "Examinations & Assessment | " + BRAND.name },
      { name: "description", content: "Measuring progress and supporting growth." },
    ],
  }),
  component: Page,
});
function Page() {
  return <ExaminationsPage />;
}
