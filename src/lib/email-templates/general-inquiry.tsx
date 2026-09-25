import React from "react";
import { Link, Section, Text } from "@react-email/components";
import { Pill, Row, s, Shell, SITE } from "./theme";

interface Props {
  name?: string;
  message?: string;
  submissionId?: string;
  /** CMS-editable — see src/lib/email-content.server.ts. */
  hintText?: string;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  whatsappUrl?: string;
  contactEmail?: string;
  footerNotice?: string;
  contactLine?: string;
  addressLine?: string;
  legalLine?: string;
  footerNote?: string;
}

const Email = ({
  name,
  message,
  submissionId,
  hintText = "In the meantime, the clearest picture of what we do is the student build log — real projects, documented as they were made.",
  primaryCtaLabel = "See student work",
  secondaryCtaLabel = "About the academy →",
  whatsappUrl,
  contactEmail,
  footerNotice,
  contactLine,
  addressLine,
  legalLine,
  footerNote = "You are receiving this because you sent a message through our Contact page.",
}: Props) => (
  <Shell
    preview="Your message reached the AstroBot Academy desk."
    docRef="Inquiry Desk · AB / CNT · General"
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
    <Text style={s.h1}>{name ? `Thanks, ${name}.` : "Thanks for getting in touch."}</Text>
    <Text style={s.p}>
      Your message is with the academy desk. General inquiries — media, collaboration, mentorship,
      sponsorship or something we have not thought of yet — are routed to the right person by hand,
      which usually takes a working day.
    </Text>

    {message ? (
      <Section style={s.panel}>
        <Text style={s.panelTitle}>Your message</Text>
        <Row label="Sent" value={message} />
      </Section>
    ) : null}

    <Text style={s.p}>{hintText}</Text>

    <Section style={{ paddingTop: "4px", paddingBottom: "6px" }}>
      <Link href={`${SITE}/students`} style={s.cta}>
        {primaryCtaLabel}
      </Link>
      <Link href={`${SITE}/about`} style={{ ...s.ghost, marginLeft: "18px" }}>
        {secondaryCtaLabel}
      </Link>
    </Section>
  </Shell>
);

export const template = {
  component: Email,
  subject: "Your message to AstroBot Academy",
  displayName: "General inquiry confirmation",
  previewData: {
    name: "Hassan",
    message: "I write for a science magazine and would like to feature your student rover project.",
    submissionId: "INQ-2026-0186",
  },
};

export default Email;
