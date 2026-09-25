import { createFileRoute } from "@tanstack/react-router";
import { StudentProfile } from "@/components/dashboard/StudentProfile";

export const Route = createFileRoute("/dashboard/admin/student/$studentId")({
  component: Page,
});

function Page() {
  const { studentId } = Route.useParams();
  return (
    <StudentProfile
      studentId={studentId}
      role="admin"
      backTo="/dashboard/admin/students"
      backLabel="Back to students"
    />
  );
}
