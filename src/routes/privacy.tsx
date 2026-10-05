import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/components/institutional/PublicPage";
import { MISSING_CONTENT } from "@/lib/brand";

const page = {
  title: "Privacy Policy",
  eyebrow: "Legal",
  intro: "An approved public privacy policy has not yet been supplied.",
  sections: [
    {
      title: "Official policy required",
      body: MISSING_CONTENT,
    },
    {
      title: "Before production launch",
      body: "Data retention, consent wording, user rights, service providers and official contact details require legal review and approval.",
    },
  ],
} as const;

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | The Signature School" },
      { name: "description", content: page.intro },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <PublicPage page={page} />;
}
