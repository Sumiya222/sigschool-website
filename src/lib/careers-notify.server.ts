/**
 * Job application confirmation email (server-only).
 *
 * Reply sent to whoever submitted the careers application form, confirming
 * exactly which role (or general application) they applied for and that
 * their CV was received. Best effort — see src/lib/email.server.ts for the
 * SMTP setup required to actually send; until configured this silently
 * no-ops, so the application itself is never blocked or affected either way.
 *
 * Rendered from src/lib/email-templates/job-application.tsx. The generic
 * wording (steps, closing line, CTA label) is CMS-editable — see
 * src/lib/email-content.server.ts.
 */
import React from "react";
import { sendReactEmail } from "@/lib/email.server";
import { getEmailContent } from "@/lib/email-content.server";
import JobApplicationEmail from "@/lib/email-templates/job-application";

export type ApplicationNotice = {
  fullName: string;
  email: string;
  position: string;
  cvFileName: string;
  submissionId?: string;
};

export async function sendApplicationConfirmation(notice: ApplicationNotice): Promise<void> {
  const content = await getEmailContent();
  await sendReactEmail({
    to: notice.email,
    from: `AstroBot Academy <${content.fromAddress}>`,
    subject: notice.position
      ? `Application received: ${notice.position}`
      : content.jobApplication.subject,
    react: React.createElement(JobApplicationEmail, {
      fullName: notice.fullName,
      position: notice.position,
      cvFilename: notice.cvFileName,
      submissionId: notice.submissionId,
      stepsHeading: content.jobApplication.stepsHeading,
      steps: content.jobApplication.steps,
      closingLine: content.jobApplication.closingLine,
      ctaLabel: content.jobApplication.ctaLabel,
      footerNote: content.jobApplication.footerNote,
      whatsappUrl: content.whatsappUrl,
      contactEmail: content.contactAddress,
      footerNotice: content.footerNotice,
      contactLine: content.contactLine,
      addressLine: content.addressLine,
      legalLine: content.legalLine,
    }),
  });
}
