import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { isHardcodedSuperAdmin } from "@/lib/super-admin";
import { PageHeader, Panel, ToastProvider, cx } from "@/components/dashboard/ui";
import { PageSectionsView } from "@/components/dashboard/site/PageSections";
import { MediaLibrary } from "@/components/dashboard/site/MediaLibrary";
import {
  AffiliationsPanel,
  ComingSoonPanel,
  CampWindowPanel,
  ContactDetailsPanel,
  FacultyDetailsPanel,
  LeadershipPanel,
  NavigationPanel,
  PartnerSchoolsPanel,
  ProgramsPanel,
  ProjectsPanel,
  StatisticsPanel,
  TestimonialsPanel,
} from "@/components/dashboard/site/Collections";
import { PagesOverview } from "@/components/dashboard/site/PagesOverview";
import { GalleryPanel } from "@/components/dashboard/site/GalleryPanel";
import { FeaturedStudentsPanel } from "@/components/dashboard/site/FeaturedStudentsPanel";
import { JobOpeningsPanel } from "@/components/dashboard/site/JobOpeningsPanel";
import { RegistrationFormPanel } from "@/components/dashboard/site/RegistrationFormPanel";

export const Route = createFileRoute("/dashboard/cms/")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: typeof search.view === "string" ? search.view : "page:home",
  }),
  component: CmsPanel,
});

interface NavEntry {
  id: string;
  label: string;
  description: string;
}

const GROUPS: { heading: string; items: NavEntry[] }[] = [
  {
    heading: "Pages",
    items: [
      { id: "page:home", label: "Home", description: "The front page of the website." },
      { id: "page:about", label: "About", description: "Who AstroBot Academy is." },
      { id: "page:programs", label: "Programs", description: "What is on offer." },
      { id: "page:schools", label: "Schools", description: "The partnership pitch for schools." },
      { id: "page:students", label: "Students", description: "What students build." },
      { id: "page:news", label: "News", description: "Announcements and updates." },
      { id: "page:contact", label: "Contact", description: "How visitors reach you." },
      { id: "page:careers", label: "Careers", description: "Working at AstroBot Academy." },
      {
        id: "page:emails",
        label: "Emails",
        description:
          "The generic wording in confirmation emails — steps, buttons and subject lines.",
      },
    ],
  },
  {
    heading: "Content",
    items: [
      {
        id: "programs",
        label: "Programs",
        description: "The programme cards used across the site.",
      },
      { id: "projects", label: "Projects", description: "Student project cards and photographs." },
      {
        id: "gallery",
        label: "Gallery",
        description: "Classroom photographs shown on the Students page.",
      },
      {
        id: "featured-students",
        label: "Featured Students",
        description: "Named students showcased at the foot of the Students page.",
      },

      {
        id: "partners",
        label: "Partner Schools",
        description: "Schools shown in the partner strip.",
      },
      {
        id: "affiliations",
        label: "Affiliations",
        description: "Organisations the academy is affiliated with.",
      },
      { id: "leadership", label: "People", description: "Leadership and the wider team." },
      {
        id: "testimonials",
        label: "Testimonials",
        description: "Quotes from schools and parents.",
      },
      {
        id: "faculty",
        label: "Faculty Details",
        description: "Figures behind the instructor credibility block.",
      },
      { id: "news", label: "News Posts", description: "Individual news articles." },
      { id: "jobs", label: "Job Openings", description: "Roles listed on the Careers page." },
    ],
  },
  {
    heading: "Camps",
    items: [
      {
        id: "camp",
        label: "Camp Window",
        description: "Open or close the camp, and edit what the banner and announcement bar say.",
      },
      {
        id: "camp-form",
        label: "Registration Form",
        description: "The questions parents answer when registering a child for a camp.",
      },
    ],
  },
  {
    heading: "Site-wide",
    items: [
      {
        id: "stats",
        label: "Statistics",
        description: "Headline numbers used across the website.",
      },
      {
        id: "navigation",
        label: "Navigation & Footer",
        description: "Menu links and footer columns.",
      },
      {
        id: "contact",
        label: "Contact Details",
        description: "Email, phone, address and social links.",
      },
      { id: "media", label: "Media Library", description: "Every picture used on the website." },
    ],
  },
];

function findEntry(id: string): NavEntry | undefined {
  for (const g of GROUPS) {
    const hit = g.items.find((i) => i.id === id);
    if (hit) return hit;
  }
  return undefined;
}

function CmsPanel() {
  return (
    <ToastProvider>
      <PanelBody />
    </ToastProvider>
  );
}

function PanelBody() {
  const { view } = useSearch({ from: "/dashboard/cms/" });
  const navigate = useNavigate({ from: "/dashboard/cms/" });
  const [knownPages, setKnownPages] = useState<string[]>([]);
  const [showConsoleLink, setShowConsoleLink] = useState(false);

  useEffect(() => {
    supabase
      .from("pages")
      .select("slug")
      .then(({ data }) => setKnownPages((data ?? []).map((r) => r.slug)));
    supabase.auth.getSession().then(({ data }) => {
      setShowConsoleLink(isHardcodedSuperAdmin(data.session?.user.email));
    });
  }, []);

  const entry = findEntry(view) ?? GROUPS[0].items[0];

  function go(id: string) {
    navigate({ search: { view: id } });
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[196px_minmax(0,1fr)]">
        <aside className="site-rail-scroll lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-6 lg:pr-1">
          {showConsoleLink && (
            <Link
              to="/dashboard/admin"
              className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-3 py-1.5 text-xs font-medium text-[color:var(--bp-ink-2)] transition hover:border-[color:var(--bp-indigo)] hover:text-[color:var(--bp-indigo)]"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Back to console
            </Link>
          )}
          <nav aria-label="CMS sections" className="space-y-5">
            {GROUPS.map((group) => (
              <div key={group.heading}>
                <p className="px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--bp-muted)]">
                  {group.heading}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.id === entry.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => go(item.id)}
                          aria-current={active ? "page" : undefined}
                          className={cx(
                            "block w-full rounded-md border px-2.5 py-1.5 text-left text-[13px] transition",
                            active
                              ? "border-[color:var(--bp-indigo)]/60 bg-[color:var(--bp-indigo)]/15 font-semibold text-[color:var(--bp-indigo)]"
                              : "border-transparent text-[color:var(--bp-ink-2)] hover:border-[color:var(--bp-line-strong)] hover:bg-[color:var(--bp-paper-2)] hover:text-[color:var(--bp-ink)]",
                          )}
                        >
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 space-y-6">
          <PageHeader
            eyebrow="CMS · Website content"
            title={entry.label}
            description={entry.description}
          />
          <ViewBody id={entry.id} knownPages={knownPages} />
        </div>
      </div>
    </div>
  );
}

function ViewBody({ id, knownPages }: { id: string; knownPages: string[] }) {
  if (id.startsWith("page:")) {
    const slug = id.slice(5);
    if (knownPages.length > 0 && !knownPages.includes(slug)) {
      return <PagesOverview missingSlug={slug} />;
    }
    return <PageSectionsView slug={slug} />;
  }

  switch (id) {
    case "programs":
      return <ProgramsPanel />;
    case "camp":
      return <CampWindowPanel />;
    case "camp-form":
      return <RegistrationFormPanel />;
    case "projects":
      return <ProjectsPanel />;
    case "gallery":
      return <GalleryPanel />;
    case "featured-students":
      return <FeaturedStudentsPanel />;

    case "partners":
      return <PartnerSchoolsPanel />;
    case "testimonials":
      return <TestimonialsPanel />;
    case "faculty":
      return <FacultyDetailsPanel />;
    case "stats":
      return <StatisticsPanel />;
    case "navigation":
      return <NavigationPanel />;
    case "contact":
      return <ContactDetailsPanel />;
    case "media":
      return <MediaLibrary />;
    case "affiliations":
      return <AffiliationsPanel />;
    case "leadership":
      return <LeadershipPanel />;
    case "news":
      return (
        <ComingSoonPanel
          title="No news posts yet"
          description="Articles you publish here will appear on the News page once that page is live."
        />
      );
    case "jobs":
      return <JobOpeningsPanel />;
    default:
      return (
        <Panel>
          <p className="text-sm text-[color:var(--bp-ink-2)]">Choose an area from the menu.</p>
        </Panel>
      );
  }
}
