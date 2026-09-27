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
import { BRAND } from "@/lib/brand";

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
    title: "See a day in the life",
    body: "The Campus Life page walks through a typical day across Lower, Middle and Upper School — classes, clubs and the daily schedule.",
  },
  {
    n: "02",
    title: "Check the right division",
    body: "Lower School (K–5), Middle School (6–8) and Upper School (9–12). Each division has its own building, schedule and faculty team.",
  },
  {
    n: "03",
    title: "Watch for the next open house",
    body: "Campus tours and information sessions run a few times a year with limited spots. We'll let you know directly when the next one opens.",
  },
];

const Email = ({
  name,
  message,
  submissionId,
  stepsHeading = "While you wait",
  steps = DEFAULT_STEPS,
  ctaLabel = "Explore admissions",
  whatsappLine = "Prefer to talk it through instead? You're welcome to call our admissions team.",
  whatsappUrl = WHATSAPP_URL,
  contactEmail,
  footerNotice,
  contactLine,
  addressLine,
  legalLine,
  footerNote = "You are receiving this because you sent an inquiry through our Contact page.",
}: Props) => (
  <Shell
    preview={`Thanks ${name || "for reaching out"} — your question is with our admissions team.`}
    docRef="Inquiry Desk · NB / CNT · Parent"
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
      Your message reached our admissions team. A member of our team reads every parent inquiry
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
      <Link href={`${SITE}/admissions`} style={s.cta}>
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
  subject: `We've got your question — ${BRAND.name}`,
  displayName: "Parent inquiry confirmation",
  previewData: {
    name: "Ayesha",
    message: "My son is 9 and starting 4th grade next fall. Which division would suit him?",
    submissionId: "INQ-2026-0184",
  },
};

export default Email;
