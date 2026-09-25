import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

const TITLE = "Privacy Policy — AstroBot Academy";
const DESCRIPTION =
  "How AstroBot Academy collects, uses, and protects the information submitted through this website.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacyPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-small leading-relaxed text-gray-mid">{children}</div>
    </section>
  );
}

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-cyan">Legal</p>
        <h1 className="mt-3 font-display text-4xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mt-3 text-small text-muted-foreground">Last updated: August 2026.</p>

        <div className="mt-8 rounded-lg border border-gold/40 bg-gold/10 px-5 py-4 text-small leading-relaxed text-foreground">
          <strong>This is an interim policy.</strong> It's written to describe, accurately and
          specifically, what this website actually does today — not to substitute for a lawyer's
          review. It has not yet had that formal legal review, and will be replaced with a reviewed
          version before the site's real public launch.
        </div>

        <Section title="Who this covers">
          <p>
            AstroBot Academy is operated under the Stellar Scholar Space Education Initiative,
            backed by Stelalliance (SMC-Private) Ltd. This policy covers the information collected
            through this website — the contact form, camp/program registration, and the careers
            page.
          </p>
        </Section>

        <Section title="What we collect, form by form">
          <p>
            <strong>Contact form.</strong> Your name, email, and phone number, plus whatever else is
            relevant to why you're getting in touch — for a parent, your child's age group and what
            you're interested in; for a school, the school's name, your role, student numbers, and
            grade levels; for anything else, your organisation and message.
          </p>
          <p>
            <strong>Camp / program registration.</strong> Filled out by a parent or guardian, not by
            the child. It asks for the child's first and last name, age, and (optionally) their
            school; the parent's own name, email, and phone/WhatsApp number; and any medical or
            accessibility notes the parent wants us to know for the child's safety and comfort.
            Individual camps or programs sometimes ask a few extra questions specific to that
            program (for example, uploading a payment receipt) — you'll always see exactly what's
            being asked before you submit anything.
          </p>
          <p>
            <strong>Careers / job applications.</strong> Your name, email, phone number, optional
            LinkedIn profile and cover note, and your CV file (PDF or Word document).
          </p>
          <p>
            With every submission, we also record a one-way, salted hash of your IP address — not
            the address itself — to help us detect spam and abuse.
          </p>
        </Section>

        <Section title="Children's information">
          <p>
            The registration form is submitted by a parent or guardian on their child's behalf. We
            rely on that parent's or guardian's consent to collect and hold the child's name, age,
            school, and any medical or accessibility notes given for that child. We don't knowingly
            collect information directly from a child through this website.
          </p>
        </Section>

        <Section title="Photographs">
          <p>
            During camps and programs, we may take photographs or video of students for use in our
            own materials — our website, social media, and similar — but only where the parent or
            guardian ticked the photography consent option on the registration form. If you didn't
            consent, we won't use images of your child that way. If you change your mind after
            registering, contact us (below) and we'll respect that.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            We don't currently run an automatic deletion schedule. We keep the information above for
            as long as we reasonably need it for the purpose it was given to us — running the
            program you registered for, considering a job application, or answering your inquiry —
            and afterward, for as long as we need it for our own records, such as invoicing a
            partner school. If you'd like something deleted sooner, ask us (below) and we will.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            <strong>Supabase</strong> — our database and file storage provider; everything above is
            stored there. <strong>Google Sheets</strong> — we keep a duplicate copy of new
            submissions in a private spreadsheet as an internal backup our own staff can read; CV
            files themselves are never copied there, only the applicant's file name.{" "}
            <strong>Resend</strong> — the service we use to send confirmation and notification
            emails, such as confirming a registration or acknowledging an inquiry.
          </p>
          <p>
            We don't sell or share your information with advertisers or unrelated third parties.
          </p>
        </Section>

        <Section title="Cookies and tracking">
          <p>
            We don't currently run third-party analytics or advertising trackers on this site. If
            you sign into the staff or school dashboard, we use standard session storage to keep you
            signed in — that's functional, not tracking. If this changes, we'll update this page.
          </p>
        </Section>

        <Section title="Access, correction, and deletion">
          <p>
            To ask what information we hold about you or your child, correct it, or have it deleted,
            email us at{" "}
            <a href="mailto:contact@astrobotacademy.com" className="text-cyan hover:underline">
              contact@astrobotacademy.com
            </a>
            . We'll get back to you and let you know once it's done.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            As noted at the top, this is an interim version. We'll update this page as our practices
            or our legal review change, and update the date at the top when we do.
          </p>
        </Section>
      </div>
    </div>
  );
}
