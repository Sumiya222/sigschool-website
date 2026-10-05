import { createFileRoute } from "@tanstack/react-router";
import { TeacherTrainingPage } from "@/components/about/AboutExperience";
export const Route = createFileRoute("/about/teacher-training")({ component: TeacherTrainingPage });
