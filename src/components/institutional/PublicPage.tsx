import { ArrowRight, Check } from "lucide-react";
import type { PublicPage as PublicPageData } from "@/lib/public-content";

export function PublicPage({ page }: { page: PublicPageData }) {
  const sectionId = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (
    <div className="tss-page">
      <section className="tss-hero">
        <div className="tss-container">
          <p className="tss-eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="tss-lead">{page.intro}</p>
          {page.actions?.length ? (
            <div className="tss-actions">
              {page.actions.map((action, index) => (
                <a
                  key={action.href}
                  href={action.href}
                  className={index === 0 ? "tss-button" : "tss-button tss-button-secondary"}
                >
                  {action.label}
                  <ArrowRight aria-hidden className="size-4" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </section>
      <section className="tss-section">
        <div className="tss-container tss-section-grid">
          {page.sections.map((section) => (
            <article
              className="tss-content"
              id={section.id ?? sectionId(section.title)}
              key={section.title}
            >
              <h2>{section.title}</h2>
              <p>{section.body}</p>
              {section.items ? (
                <ul>
                  {section.items.map((item) => (
                    <li key={item}>
                      <Check aria-hidden className="size-4" />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
