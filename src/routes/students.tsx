import { createFileRoute } from "@tanstack/react-router";
import {
  PjClosingCta,
  PjFeatured,
  PjGallery,
  PjHero,
  PjProgression,
} from "@/components/projects/sections";
import { PjPhotoGallery } from "@/components/projects/PhotoGallery";
import { PjFeaturedStudents } from "@/components/projects/FeaturedStudents";
import { getGalleryImages } from "@/lib/gallery.functions";
import { getFeaturedStudents } from "@/lib/featured-students.functions";
import { BRAND } from "@/lib/brand";

const TITLE = `Student Life | ${BRAND.name}`;
const DESCRIPTION = `Achievements, performances, and campus moments from students across the Lower, Middle, and Upper School at ${BRAND.name}.`;

export const Route = createFileRoute("/students")({
  loader: async () => {
    const [gallery, students] = await Promise.all([getGalleryImages(), getFeaturedStudents()]);
    return { gallery, students };
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
  }),
  errorComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center text-foreground">
      <h1 className="font-display text-2xl font-bold">This page could not be loaded.</h1>
      <p className="mt-3 text-gray-mid">Please refresh, or try again in a moment.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center text-foreground">
      <h1 className="font-display text-2xl font-bold">Page not found.</h1>
    </div>
  ),
  component: StudentsPage,
});

function StudentsPage() {
  const { gallery, students } = Route.useLoaderData();
  return (
    <div className="relative z-10 isolate transform-gpu">
      <PjHero />
      <PjFeatured />
      <PjGallery />
      <PjPhotoGallery images={gallery} />
      <PjProgression />
      <PjFeaturedStudents students={students} />
      <PjClosingCta />
    </div>
  );
}
