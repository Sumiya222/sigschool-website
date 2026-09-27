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
  parentName?: string;
  studentName?: string;
  campName?: string;
  track?: string;
  age?: number | string;
  waitlisted?: boolean;
  receiptFilename?: string;
  submissionId?: string;
  /** CMS-editable — see src/lib/email-content.server.ts. */
  stepsHeadingConfirmed?: string;
  stepsConfirmed?: EmailStep[];
  stepsHeadingWaitlisted?: string;
  stepsWaitlisted?: EmailStep[];
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

const DEFAULT_STEPS_CONFIRMED: EmailStep[] = [
  {
    n: "01",
    title: "Check the details above",
    body: "Let us know on WhatsApp right away if anything needs correcting — especially your child's age, which sets the track and the tools they are allowed to use.",
  },
  {
    n: "02",
    title: "Joining instructions",
    body: "Timings, the venue map, the drop-off and pick-up procedure and the kit list arrive closer to the start date.",
  },
  {
    n: "03",
    title: "What to bring",
    body: "Just a water bottle and curiosity. Every component, tool and laptop is provided by the academy.",
  },
];

const DEFAULT_STEPS_WAITLISTED: EmailStep[] = [
  {
    n: "01",
    title: "You keep your position",
    body: "Places move often as plans change. Your position is fixed by the time you registered.",
  },
  {
    n: "02",
    title: "We call before we email",
    body: "If a seat opens close to the start date, we phone the number you gave us first.",
  },
];

const Email = ({
  parentName,
  studentName,
  campName,
  track,
  age,
  waitlisted,
  receiptFilename,
  submissionId,
  stepsHeadingConfirmed = "Before day one",
  stepsConfirmed = DEFAULT_STEPS_CONFIRMED,
  stepsHeadingWaitlisted = "What happens now",
  stepsWaitlisted = DEFAULT_STEPS_WAITLISTED,
  ctaLabel = "View the program",
  whatsappLine = "Any questions before the camp? Our team is just a WhatsApp message away.",
  whatsappUrl = WHATSAPP_URL,
  contactEmail,
  footerNotice,
  contactLine,
  addressLine,
  legalLine,
  footerNote = `You are receiving this because you registered a child at ${BRAND.name}.`,
}: Props) => (
  <Shell
    preview={
      waitlisted
        ? `${studentName || "Your child"} is on the waitlist for ${campName || "the camp"}.`
        : `${studentName || "Your child"}'s seat at ${campName || "the camp"} is registered.`
    }
    docRef="Registrations · AB / CMP"
    footerNote={footerNote}
    reference={submissionId ? `Registration ${submissionId}` : undefined}
    whatsappUrl={whatsappUrl}
    contactEmail={contactEmail}
    footerNotice={footerNotice}
    contactLine={contactLine}
    addressLine={addressLine}
    legalLine={legalLine}
  >
    <Pill
      label={waitlisted ? "Waitlisted" : "Seat confirmed"}
      color={waitlisted ? "#b45309" : "#0f9d8f"}
      bg={waitlisted ? "#fef3c7" : "#e8f7f5"}
    />
    <Text style={s.h1}>
      {waitlisted
        ? `${studentName || "Your child"} is on the waitlist.`
        : `${studentName || "Your child"} is registered.`}
    </Text>
    <Text style={s.p}>
      {parentName ? `${parentName}, thank you. ` : ""}
      {waitlisted
        ? "This camp is currently at capacity. Waitlist places are offered strictly in order as seats free up, and we will contact you the moment one does — no payment is due unless a seat is confirmed."
        : "The place is held. Below is exactly what we have on file; check it now, because these details drive the group list, the kit count and the safety register on day one."}
    </Text>

    <Section style={s.panel}>
      <Text style={s.panelTitle}>Registration record</Text>
      <Row label="Camp" value={campName} />
      <Row label="Student" value={studentName} />
      <Row label="Age" value={age != null ? String(age) : undefined} />
      <Row label="Age track" value={track} />
      <Row label="Parent / guardian" value={parentName} />
      <Row label="Payment receipt" value={receiptFilename} />
      <Row label="Status" value={waitlisted ? "Waitlisted" : "Confirmed"} />
    </Section>

    {waitlisted ? (
      <>
        <Text style={s.eyebrow}>{stepsHeadingWaitlisted}</Text>
        {stepsWaitlisted.map((step) => (
          <Step key={step.n} n={step.n} title={step.title} body={step.body} />
        ))}
      </>
    ) : (
      <>
        <Text style={s.eyebrow}>{stepsHeadingConfirmed}</Text>
        {stepsConfirmed.map((step) => (
          <Step key={step.n} n={step.n} title={step.title} body={step.body} />
        ))}
      </>
    )}

    <Section style={{ paddingTop: "6px", paddingBottom: "6px" }}>
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
  subject: `Enrollment received — ${BRAND.name}`,
  displayName: "Camp registration confirmation",
  previewData: {
    parentName: "Nadia Rehman",
    studentName: "Zoya Rehman",
    campName: "Summer Boot Camp 2026",
    track: "Young Innovators (8–12)",
    age: 10,
    waitlisted: false,
    receiptFilename: "bank-transfer-receipt.pdf",
    submissionId: "REG-2026-0311",
  },
};

export default Email;
