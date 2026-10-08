import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";
import { PUBLIC_PAGES } from "@/lib/public-content";
import { BRAND } from "@/lib/brand";

const page = PUBLIC_PAGES["/faqs"];

export const Route = createFileRoute("/faqs")({
  head: () => ({
    meta: [
      { title: page.title + " | " + BRAND.name },
      { name: "description", content: page.intro },
    ],
  }),
  component: Page,
});
function Page() {
  return (
    <main className="faq-page">
      <section className="faq-hero">
        <div className="reference-container">
          <p className="reference-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p>{page.intro}</p>
        </div>
      </section>

      <section className="faq-section">
        <div className="reference-container faq-layout">
          <aside className="faq-intro-card">
            <span>
              <HelpCircle aria-hidden />
            </span>
            <p className="reference-eyebrow">Quick answers</p>
            <h2>How can we help?</h2>
            <p>
              Browse the most common questions about learning, admissions and becoming a Signature
              School partner.
            </p>
            <a href="/contact">
              <MessageCircle aria-hidden /> Contact our team
            </a>
          </aside>

          <div className="faq-list">
            {page.sections.map((section, index) => (
              <details key={section.title} name="signature-faqs" open={index === 0}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{section.title}</strong>
                  <ChevronDown aria-hidden />
                </summary>
                <div>
                  <p>{section.body}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
