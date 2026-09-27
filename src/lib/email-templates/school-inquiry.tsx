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
  schoolName?: string;
  role?: string;
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
    title: "Scoping call",
    body: "Grade bands, section sizes, weekly slot length and your available room. Twenty minutes is usually enough.",
  },
  {
    n: "02",
    title: "Delivery specification",
    body: "We send a written spec: what the academy supplies (instructors, kits, curriculum, assessment) and the short list your campus provides.",
  },
  {
    n: "03",
    title: "Pilot term, then scale",
    body: "Most partners begin with one or two sections for a term, with reporting per student, before extending across grades.",
  },
];

const Email = ({
  name,
  schoolName,
  role,
  message,
  submissionId,
  stepsHeading = "How the engagement runs",
  steps = DEFAULT_STEPS,
  ctaLabel = "Read the delivery specification",
  whatsappLine = "If your academic calendar has a fixed decision date, let us know on WhatsApp and we will work backwards from it.",
  whatsappUrl = WHATSAPP_URL,
  contactEmail,
  footerNotice,
  contactLine,
  addressLine,
  legalLine,
  footerNote = "You are receiving this because your school submitted a partnership inquiry.",
}: Props) => (
  <Shell
    preview={`${schoolName || "Your school"} — your partnership inquiry is logged with the academy.`}
    docRef="Partnership Desk · AB / CNT · School"
    footerNote={footerNote}
    reference={submissionId ? `Reference ${submissionId}` : undefined}
    whatsappUrl={whatsappUrl}
    contactEmail={contactEmail}
    footerNotice={footerNotice}
    contactLine={contactLine}
    addressLine={addressLine}
    legalLine={legalLine}
  >
    <Pill label="Partnership logged" />
    <Text style={s.h1}>{schoolName ? `Received — ${schoolName}.` : "Your inquiry is logged."}</Text>
    <Text style={s.p}>
      {name ? `${name}, thank you.` : "Thank you."} Your inquiry has been entered on the partnership
      docket. Institutional requests are handled by our programs lead rather than a general inbox,
      so the reply you get will be specific to your campus — not a template.
    </Text>

    <Section style={s.panel}>
      <Text style={s.panelTitle}>Inquiry record</Text>
      <Row label="School" value={schoolName} />
      <Row label="Contact" value={name} />
      <Row label="Role" value={role} />
      <Row label="Message" value={message} />
    </Section>

    <Text style={s.eyebrow}>{stepsHeading}</Text>
    {steps.map((step) => (
      <Step key={step.n} n={step.n} title={step.title} body={step.body} />
    ))}

    <Section style={{ paddingTop: "8px", paddingBottom: "6px" }}>
      <Link href={`${SITE}/schools`} style={s.cta}>
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
  subject: `Your inquiry — ${BRAND.name}`,
  displayName: "School inquiry confirmation",
  previewData: {
    name: "Mr. Kamran Ali",
    schoolName: "Beaconhouse Margalla Campus",
    role: "Head of Academics",
    message: "We would like to explore a weekly robotics slot for grades 6–8 from the spring term.",
    submissionId: "INQ-2026-0185",
  },
};

export default Email;
