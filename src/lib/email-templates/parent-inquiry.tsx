import React from "react";
import { Link, Section, Text } from "@react-email/components";
import {
  Pill,
  Row,
  s,
  Shell,
  SITE,
  Step,
  WhatsAppText,
  WHATSAPP_URL,
  type EmailStep,
} from "./theme";

interface Props {
  name?: string;
  message?: string;
  submissionId?: string;
  /** CMS-editable — see src/lib/email-content.server.ts. */
  stepsHeading?: string;
  steps?: EmailStep[];
  ctaLabel?: string;
  whatsappLine?: string;
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
    title: "See what your child would actually build",
    body: "Our students design, wire and program real hardware — rovers, satellites and sensor rigs. The Students page is the honest build log, not a brochure.",
  },
  {
    n: "02",
    title: "Check the age track",
    body: "Junior Tinkers (5–7), Young Innovators (8–12) and Future Engineers (13–17). Each track has its own pace, tools and safety rules.",
  },
  {
    n: "03",
    title: "Watch for the next intake",
    body: "Camp and workshop windows open a few times a year with limited seats. We will tell you directly when the next one opens.",
  },
];

const Email = ({
  name,
  message,
  submissionId,
  stepsHeading = "While you wait",
  steps = DEFAULT_STEPS,
  ctaLabel = "Explore the programs",
  whatsappLine = "Prefer to talk it through instead? You're welcome to reach our team directly on WhatsApp.",
  whatsappUrl = WHATSAPP_URL,
  contactEmail,
  footerNotice,
  contactLine,
  addressLine,
  legalLine,
  footerNote = "You are receiving this because you sent an inquiry through our Contact page.",
}: Props) => (
  <Shell
    preview={`Thanks ${name || "for reaching out"} — your question about our programs is with the academy team.`}
    docRef="Inquiry Desk · AB / CNT · Parent"
    footerNote={footerNote}
    reference={submissionId ? `Reference ${submissionId}` : undefined}
    whatsappUrl={whatsappUrl}
    contactEmail={contactEmail}
    footerNotice={footerNotice}
    contactLine={contactLine}
    addressLine={addressLine}
    legalLine={legalLine}
  >
    <Pill label="Message received" />
    <Text style={s.h1}>{name ? `Thank you, ${name}.` : "Thank you for writing in."}</Text>
    <Text style={s.p}>
      Your message reached the academy desk. A member of our team reads every parent inquiry
      personally — we do not send you into a queue and we will not pass your details to anyone else.
      You can expect to hear from us within one working day.
    </Text>

    {message ? (
      <Section style={s.panel}>
        <Text style={s.panelTitle}>What you sent us</Text>
        <Row label="Message" value={message} />
      </Section>
    ) : null}

    <Text style={s.eyebrow}>{stepsHeading}</Text>
    {steps.map((step) => (
      <Step key={step.n} n={step.n} title={step.title} body={step.body} />
    ))}

    <Section style={{ paddingTop: "8px", paddingBottom: "6px" }}>
      <Link href={`${SITE}/programs`} style={s.cta}>
        {ctaLabel}
      </Link>
    </Section>
    <Text style={s.p}>
      <WhatsAppText text={whatsappLine} whatsappUrl={whatsappUrl} />
    </Text>
  </Shell>
);

export const template = {
  component: Email,
  subject: "We've got your question — AstroBot Academy",
  displayName: "Parent inquiry confirmation",
  previewData: {
    name: "Ayesha",
    message: "My son is 9 and loves taking things apart. Which track would suit him best?",
    submissionId: "INQ-2026-0184",
  },
};

export default Email;
