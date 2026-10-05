import { createFileRoute } from "@tanstack/react-router";
import { AdmissionProcedurePage } from "@/components/institutional/ReferenceAcademicPages";
import { BRAND } from "@/lib/brand";
export const Route = createFileRoute("/admission-procedure")({
  head: () => ({
    meta: [
      { title: "Admission Procedure | " + BRAND.name },
      { name: "description", content: "Your journey to Signature School." },
    ],
  }),
  component: Page,
});
function Page() {
  return <AdmissionProcedurePage />;
}
