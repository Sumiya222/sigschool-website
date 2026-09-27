import { createFileRoute } from "@tanstack/react-router";
import { CtHero, CtPaths, CtResponse } from "@/components/contact/sections";
import { BRAND } from "@/lib/brand";

const TITLE = `Contact | ${BRAND.name}`;
const DESCRIPTION = `Send an inquiry to ${BRAND.name}, or reach us on WhatsApp, by email, or at ${BRAND.addressLine}. Typical response within 24 hours.`;

export const Route = createFileRoute("/contact")({
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
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="relative z-10 isolate transform-gpu">
      <CtHero />
      <CtPaths />
      <CtResponse />
    </div>
  );
}
