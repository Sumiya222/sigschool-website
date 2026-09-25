import { createFileRoute } from "@tanstack/react-router";
import { StudentProfile } from "@/components/dashboard/StudentProfile";

export const Route = createFileRoute("/dashboard/instructor/student/$studentId")({
  component: Page,
});

function Page() {
  const { studentId } = Route.useParams();
  return (
    <StudentProfile
      studentId={studentId}
      role="instructor"
      backTo="/dashboard/instructor"
      backLabel="Back to my classes"
    />
  );
}
