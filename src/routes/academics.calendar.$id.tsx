import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/components/institutional/ReferenceAcademicPages";
import { BRAND } from "@/lib/brand";
export const Route = createFileRoute("/academics/calendar/$id")({
  head: () => ({
    meta: [
      { title: "Academic Calendar | " + BRAND.name },
      { name: "description", content: "Signature School academic calendar details." },
    ],
  }),
  component: Page,
});
function Page() {
  const { id } = Route.useParams();
  return <CalendarPage id={id} />;
}
