/**
 * Contact-page inquiry emails (server-only).
 *
 * Reply sent to whoever submitted the "Contact us" form, confirming exactly
 * what they sent. Best effort — see src/lib/email.server.ts for the SMTP
 * setup required to actually send; until configured this silently no-ops, so
 * the inquiry itself is never blocked or affected either way.
 *
 * Rendered from the src/lib/email-templates/*.tsx React components — one
 * per inquiry track (parent/school/general) — via sendReactEmail(). The
 * generic wording (steps, CTA labels, subject) is CMS-editable — see
 * src/lib/email-content.server.ts — while the personalized parts (name,
 * message excerpt) are filled in here.
 */
import React from "react";
import { sendReactEmail } from "@/lib/email.server";
import { getEmailContent } from "@/lib/email-content.server";
import ParentInquiryEmail from "@/lib/email-templates/parent-inquiry";
import SchoolInquiryEmail from "@/lib/email-templates/school-inquiry";
import GeneralInquiryEmail from "@/lib/email-templates/general-inquiry";
import type { InquiryType } from "@/lib/inquiries.functions";

export type InquiryNotice = {
  fullName: string;
  email: string;
  type: InquiryType;
  schoolName?: string | null;
  role?: string | null;
  message: string;
  submissionId?: string;
};

export async function sendInquiryConfirmation(notice: InquiryNotice): Promise<void> {
  const firstName = notice.fullName.split(" ")[0];
  const excerpt = notice.message.length > 400 ? notice.message.slice(0, 397) + "…" : notice.message;
  const content = await getEmailContent();
  const from = `AstroBot Academy <${content.fromAddress}>`;
  const footer = {
    whatsappUrl: content.whatsappUrl,
    contactEmail: content.contactAddress,
    footerNotice: content.footerNotice,
    contactLine: content.contactLine,
    addressLine: content.addressLine,
    legalLine: content.legalLine,
  };

  if (notice.type === "parent") {
    await sendReactEmail({
      to: notice.email,
      from,
      subject: content.parentInquiry.subject,
      react: React.createElement(ParentInquiryEmail, {
        name: firstName,
        message: excerpt,
        submissionId: notice.submissionId,
        stepsHeading: content.parentInquiry.stepsHeading,
        steps: content.parentInquiry.steps,
        ctaLabel: content.parentInquiry.ctaLabel,
        whatsappLine: content.parentInquiry.whatsappLine,
        footerNote: content.parentInquiry.footerNote,
        ...footer,
      }),
    });
    return;
  }

  if (notice.type === "school") {
    await sendReactEmail({
      to: notice.email,
      from,
      subject: content.schoolInquiry.subject,
      react: React.createElement(SchoolInquiryEmail, {
        name: notice.fullName,
        schoolName: notice.schoolName ?? undefined,
        role: notice.role ?? undefined,
        message: excerpt,
        submissionId: notice.submissionId,
        stepsHeading: content.schoolInquiry.stepsHeading,
        steps: content.schoolInquiry.steps,
        ctaLabel: content.schoolInquiry.ctaLabel,
        whatsappLine: content.schoolInquiry.whatsappLine,
        footerNote: content.schoolInquiry.footerNote,
        ...footer,
      }),
    });
    return;
  }

  // General inquiry fallback — also covers any type not explicitly handled
  // above, so a submission never goes unanswered because of an unrecognized
  // track.
  await sendReactEmail({
    to: notice.email,
    from,
    subject: content.generalInquiry.subject,
    react: React.createElement(GeneralInquiryEmail, {
      name: firstName,
      message: excerpt,
      submissionId: notice.submissionId,
      hintText: content.generalInquiry.hintText,
      primaryCtaLabel: content.generalInquiry.primaryCtaLabel,
      secondaryCtaLabel: content.generalInquiry.secondaryCtaLabel,
      footerNote: content.generalInquiry.footerNote,
      ...footer,
    }),
  });
}
