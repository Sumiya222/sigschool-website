import campus from "@/assets/reference-home/campus-life.png";
import digitalLearning from "@/assets/reference-home/learning-experience.png";
import leadership from "@/assets/reference-home/leadership-programmes.png";
import studentLife from "@/assets/reference-home/student-life.png";
import campusTour from "@/assets/reference-home/campus-tour.png";

export const galleryItems = [
  ["Campus", campus],
  ["Digital Learning", digitalLearning],
  ["Leadership", leadership],
  ["Student Activities", studentLife],
  ["Campus Tour", campusTour],
].map(([category, src], index) => ({
  id: `school-view-${index + 1}`,
  category,
  src,
  alt: `${category} visual placeholder`,
  caption: `${category} — illustrative website image; official school photography to be provided`,
  placeholder: true,
}));
export const schoolEnvironment = [
  ["Digital-First", "Technology-enabled learning and school management."],
  ["Bookless Learning", "Digital resources and learning tools."],
  ["Safe & Supportive", "A respectful and supportive environment."],
  ["Future-Ready", "Skills for technology, communication, creativity and leadership."],
  ["Practical Learning", "Projects, activities and real-world application."],
  ["Parent Partnership", "Connected communication between school and families."],
] as const;
