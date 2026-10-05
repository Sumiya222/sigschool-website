import { createFileRoute } from "@tanstack/react-router";
import { ReferenceLearningPage } from "@/components/institutional/ReferenceLearningPage";
export const Route = createFileRoute("/student-life")({
  component: Page,
});
function Page() {
  return <ReferenceLearningPage path="/student-life" />;
}
