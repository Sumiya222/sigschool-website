import { createFileRoute } from "@tanstack/react-router";
import { StudentProfile } from "@/components/dashboard/StudentProfile";

export const Route = createFileRoute("/dashboard/school/student/$studentId")({
  component: Page,
});

function Page() {
  const { studentId } = Route.useParams();
  return (
    <StudentProfile
      studentId={studentId}
      role="school"
      backTo="/dashboard/school"
      backLabel="Back to overview"
    />
  );
}
