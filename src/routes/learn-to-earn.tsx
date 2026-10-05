import { createFileRoute } from "@tanstack/react-router";
import { ReferenceLearningPage } from "@/components/institutional/ReferenceLearningPage";
export const Route = createFileRoute("/learn-to-earn")({
  component: Page,
});
function Page() {
  return <ReferenceLearningPage path="/learn-to-earn" />;
}
