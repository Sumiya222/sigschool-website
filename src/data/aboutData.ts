import { BookOpen, Lightbulb, Laptop, MessageCircle, ShieldCheck, Users } from "lucide-react";

export const aboutCards = [
  {
    title: "Vision & Mission",
    description:
      "Discover the purpose, direction and educational values that guide Signature School.",
    cta: "Explore Vision & Mission",
    href: "/about/vision-mission",
  },
  {
    title: "Chairperson's Message",
    description: "Read the leadership message and educational vision behind Signature School.",
    cta: "Read Message",
    href: "/about/chairperson",
  },
  {
    title: "Signature School at a Glance",
    description:
      "Explore Signature School's learning ecosystem, network and educational environment.",
    cta: "Explore at a Glance",
    href: "/about/at-a-glance",
  },
  {
    title: "Teacher Training",
    description:
      "Discover how Signature School supports teachers through professional development and technology-enabled education.",
    cta: "Explore Teacher Training",
    href: "/about/teacher-training",
  },
] as const;

export const missionPillars = [
  [
    BookOpen,
    "Academic Excellence",
    "Building strong academic foundations and a culture of continuous learning.",
  ],
  [ShieldCheck, "Character", "Developing integrity, responsibility, respect and positive values."],
  [Lightbulb, "Creativity", "Encouraging imagination, innovation and creative expression."],
  [Lightbulb, "Critical Thinking", "Helping students analyze, question and solve problems."],
  [MessageCircle, "Communication", "Developing confident written, verbal and presentation skills."],
  [Users, "Leadership", "Developing responsible, confident and collaborative leaders."],
  [Laptop, "Digital Literacy", "Preparing students for a technology-driven world."],
  [Users, "Collaboration", "Helping students learn through teamwork and shared experiences."],
  [Lightbulb, "Problem Solving", "Connecting knowledge with practical situations."],
  [
    Lightbulb,
    "Entrepreneurial Thinking",
    "Encouraging initiative, creativity and practical thinking.",
  ],
] as const;

export const learningModel = [
  ["Understand", "Build strong conceptual foundations."],
  ["Practice", "Apply knowledge through exercises and activities."],
  ["Create", "Develop ideas, projects and solutions."],
  ["Collaborate", "Learn through teamwork and communication."],
  ["Lead", "Use knowledge, skills and character to create positive impact."],
] as const;
