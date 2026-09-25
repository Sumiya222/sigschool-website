import React from "react";
import { Link, Section, Text } from "@react-email/components";
import { Pill, Row, s, Shell, SITE, Step, type EmailStep } from "./theme";

interface Props {
  fullName?: string;
  position?: string;
  cvFilename?: string;
  submissionId?: string;
  /** CMS-editable — see src/lib/email-content.server.ts. */
  stepsHeading?: string;
  steps?: EmailStep[];
  closingLine?: string;
  ctaLabel?: string;
  whatsappUrl?: string;
  contactEmail?: string;
  footerNotice?: string;
  contactLine?: string;
  addressLine?: string;
  legalLine?: string;
  footerNote?: string;
}

const DEFAULT_STEPS: EmailStep[] = [
  {
    n: "01",
    title: "Review — within one week",
    body: "We look for evidence you have built and taught real things, not only studied them.",
  },
  {
    n: "02",
    title: "Conversation",
    body: "A relaxed call about your background, the age group you would teach and how you explain hard ideas simply.",
  },
  {
    n: "03",
    title: "Teaching demo",
    body: "Shortlisted candidates run a short session with a real group. We pay for your time on the day.",
  },
];

const Email = ({
  fullName,
  position,
  cvFilename,
  submissionId,
  stepsHeading = "Our process",
  steps = DEFAULT_STEPS,
  closingLine = "You will hear from us either way. If the answer is no, we will tell you plainly rather than leave you waiting.",
  ctaLabel = "View all open roles",
  whatsappUrl,
  contactEmail,
  footerNotice,
  contactLine,
  addressLine,
  legalLine,
  footerNote = "You are receiving this because you applied through the AstroBot Academy careers page.",
}: Props) => (
  <Shell
    preview={`Application received${position ? ` — ${position}` : ""}. Here is what happens next.`}
    docRef="Recruitment · AB / CAR"
    footerNote={footerNote}
    reference={submissionId ? `Application ${submissionId}` : undefined}
    whatsappUrl={whatsappUrl}
    contactEmail={contactEmail}
    footerNotice={footerNotice}
    contactLine={contactLine}
    addressLine={addressLine}
    legalLine={legalLine}
  >
    <Pill label="Application received" />
    <Text style={s.h1}>
      {fullName ? `${fullName}, we have your application.` : "We have your application."}
    </Text>
    <Text style={s.p}>
      Thank you for applying{position ? ` for the ${position} role` : ""}. Every application is read
      by the person who would actually work with you — not filtered by a keyword scanner. That takes
      a little longer and is worth it.
    </Text>

    <Section style={s.panel}>
      <Text style={s.panelTitle}>What we received</Text>
      <Row label="Applicant" value={fullName} />
      <Row label="Position" value={position} />
      <Row label="CV on file" value={cvFilename} />
    </Section>

    <Text style={s.eyebrow}>{stepsHeading}</Text>
    {steps.map((step) => (
      <Step key={step.n} n={step.n} title={step.title} body={step.body} />
    ))}

    <Text style={s.strongP}>{closingLine}</Text>

    <Section style={{ paddingTop: "4px", paddingBottom: "6px" }}>
      <Link href={`${SITE}/careers`} style={s.cta}>
        {ctaLabel}
      </Link>
    </Section>
  </Shell>
);

export const template = {
  component: Email,
  subject: "Your application to AstroBot Academy",
  displayName: "Job application received",
  previewData: {
    fullName: "Sara Iqbal",
    position: "Robotics Instructor",
    cvFilename: "sara-iqbal-cv.pdf",
    submissionId: "APP-2026-0042",
  },
};

export default Email;
