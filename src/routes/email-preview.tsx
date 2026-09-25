import { createFileRoute } from "@tanstack/react-router";
import React from "react";
import ParentInquiry, { template as parentT } from "@/lib/email-templates/parent-inquiry";
import SchoolInquiry, { template as schoolT } from "@/lib/email-templates/school-inquiry";
import GeneralInquiry, { template as generalT } from "@/lib/email-templates/general-inquiry";
import JobApplication, { template as jobT } from "@/lib/email-templates/job-application";
import CampRegistration, { template as campT } from "@/lib/email-templates/camp-registration";
import { getEmailContentForPreview } from "@/lib/email-content.functions";
import type { EmailContent } from "@/lib/email-content.server";
import { useRequireAnyRole } from "@/lib/dashboard-auth";
import { DashboardLoading } from "@/components/dashboard/DashboardShell";

const TITLE = "Email templates preview — AstroBot Academy";
const DESCRIPTION = "Internal preview of the confirmation emails sent after each website form.";

export const Route = createFileRoute("/email-preview")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EmailPreviewPage,
});

/** Shared props every template pulls from CMS content, regardless of which
 * template-specific slice (parentInquiry, schoolInquiry, etc.) is used. */
function footerProps(content: EmailContent) {
  return {
    whatsappUrl: content.whatsappUrl,
    contactEmail: content.contactAddress,
    footerNotice: content.footerNotice,
    contactLine: content.contactLine,
    addressLine: content.addressLine,
    legalLine: content.legalLine,
  };
}

function buildItems(content: EmailContent) {
  const footer = footerProps(content);
  return [
    {
      key: "parent",
      Comp: ParentInquiry,
      displayName: parentT.displayName,
      subject: content.parentInquiry.subject,
      previewData: { ...parentT.previewData, ...content.parentInquiry, ...footer },
    },
    {
      key: "school",
      Comp: SchoolInquiry,
      displayName: schoolT.displayName,
      subject: content.schoolInquiry.subject,
      previewData: { ...schoolT.previewData, ...content.schoolInquiry, ...footer },
    },
    {
      key: "general",
      Comp: GeneralInquiry,
      displayName: generalT.displayName,
      subject: content.generalInquiry.subject,
      previewData: { ...generalT.previewData, ...content.generalInquiry, ...footer },
    },
    {
      key: "job",
      Comp: JobApplication,
      displayName: jobT.displayName,
      subject: content.jobApplication.subject,
      previewData: { ...jobT.previewData, ...content.jobApplication, ...footer },
    },
    {
      key: "camp",
      Comp: CampRegistration,
      displayName: campT.displayName,
      subject: content.campRegistration.subject,
      previewData: { ...campT.previewData, ...content.campRegistration, ...footer },
    },
    {
      key: "camp-waitlist",
      Comp: CampRegistration,
      displayName: "Camp registration — waitlisted",
      subject: "You're on the waitlist — AstroBot Academy",
      previewData: {
        ...campT.previewData,
        ...content.campRegistration,
        ...footer,
        waitlisted: true,
        receiptFilename: undefined,
      },
    },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Frame({ Comp, data }: { Comp: React.ComponentType<any>; data: any }) {
  const [html, setHtml] = React.useState<string>("");
  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { render } = await import("@react-email/render");
      const out = await render(<Comp {...data} />, { pretty: false });
      if (alive) setHtml(out);
    })();
    return () => {
      alive = false;
    };
  }, [Comp, data]);

  return (
    <iframe
      title="Email preview"
      srcDoc={html}
      className="h-[760px] w-full rounded-xl border border-foreground/15 bg-white"
    />
  );
}

function EmailPreviewPage() {
  // Client-side, post-hydration check — same pattern every other dashboard
  // page uses. This is what redirects to /dashboard/login, and it runs
  // after the browser's Supabase session is available, unlike a route
  // loader (which runs during server rendering, before that session can be
  // attached to the request — that mismatch is what caused the redirect
  // loop). getEmailContentForPreview() below is still the real access
  // check; this only gates the UI.
  const authState = useRequireAnyRole();
  const [content, setContent] = React.useState<EmailContent | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authState.status !== "ready") return;
    let alive = true;
    getEmailContentForPreview()
      .then((c) => {
        if (alive) setContent(c);
      })
      .catch(() => {
        if (alive) {
          setError(
            "Your account doesn't have permission to view this. Only Super Admin and approved CMS accounts can.",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [authState.status]);

  const items = React.useMemo(() => (content ? buildItems(content) : []), [content]);
  const [active, setActive] = React.useState(0);

  if (authState.status !== "ready") return <DashboardLoading />;
  if (error) {
    return (
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 py-16 text-foreground">
        <p className="text-gray-mid">{error}</p>
      </div>
    );
  }
  if (!content) return <DashboardLoading />;

  const item = items[active];

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 py-16 text-foreground">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-cyan">
        Internal · Email design
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold">Form confirmation emails</h1>
      <p className="mt-3 max-w-2xl text-gray-mid">
        These are the exact templates the site sends after each form, rendered with whatever is
        currently set in <code>Dashboard → CMS → Pages → Emails</code> — not just the hardcoded
        defaults.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        {items.map((i, idx) => (
          <button
            key={i.key}
            type="button"
            onClick={() => setActive(idx)}
            className={
              "rounded-lg border px-3.5 py-2 text-[13px] font-medium transition " +
              (idx === active
                ? "border-cyan/50 bg-cyan/10 text-foreground"
                : "border-foreground/15 text-gray-mid hover:text-foreground")
            }
          >
            {i.displayName}
          </button>
        ))}
      </div>

      <p className="mt-6 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-gray-mid">
        Subject · {item.subject}
      </p>

      <div className="mt-3">
        <Frame Comp={item.Comp} data={item.previewData} />
      </div>
    </div>
  );
}
