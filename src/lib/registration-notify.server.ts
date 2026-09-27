/**
 * Camp registration confirmation email (server-only).
 *
 * Reply sent to the parent who registered, confirming exactly what they
 * submitted and whether they're confirmed or waitlisted — rendered from
 * src/lib/email-templates/camp-registration.tsx. The generic wording
 * (steps, CTA label) is CMS-editable — see src/lib/email-content.server.ts.
 * Best-effort — see src/lib/email.server.ts for the SMTP setup required to
 * actually send; until configured this silently no-ops, so a registration
 * itself is never blocked or affected either way.
 *
 * The admin-facing side of a registration no longer sends an immediate
 * email here — it batches into the daily digest instead (see
 * admin-digest.server.ts), except for the one urgent case (a camp nearing
 * or at capacity), which goes through urgent-admin-alerts.server.ts.
 */
import React from "react";
import { sendReactEmail } from "@/lib/email.server";
import { getEmailContent } from "@/lib/email-content.server";
import CampRegistrationEmail from "@/lib/email-templates/camp-registration";
import { BRAND } from "@/lib/brand";

export type RegistrationNotice = {
  id: string;
  campName: string;
  studentName: string;
  age: number;
  track: string;
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  waitlisted: boolean;
};

/** Reply sent to the parent themselves, confirming exactly what they
 * submitted and whether a seat is confirmed or they've been waitlisted. */
export async function sendRegistrationConfirmation(notice: RegistrationNotice): Promise<void> {
  const content = await getEmailContent();
  const subject = notice.waitlisted
    ? `You're on the waitlist for ${notice.campName}`
    : content.campRegistration.subject;

  await sendReactEmail({
    to: notice.parentEmail,
    from: `${BRAND.name} <${content.fromAddress}>`,
    subject,
    react: React.createElement(CampRegistrationEmail, {
      parentName: notice.parentName,
      studentName: notice.studentName,
      campName: notice.campName,
      track: notice.track,
      age: notice.age,
      waitlisted: notice.waitlisted,
      submissionId: notice.id,
      stepsHeadingConfirmed: content.campRegistration.stepsHeadingConfirmed,
      stepsConfirmed: content.campRegistration.stepsConfirmed,
      stepsHeadingWaitlisted: content.campRegistration.stepsHeadingWaitlisted,
      stepsWaitlisted: content.campRegistration.stepsWaitlisted,
      ctaLabel: content.campRegistration.ctaLabel,
      whatsappLine: content.campRegistration.whatsappLine,
      footerNote: content.campRegistration.footerNote,
      whatsappUrl: content.whatsappUrl,
      contactEmail: content.contactAddress,
      footerNotice: content.footerNotice,
      contactLine: content.contactLine,
      addressLine: content.addressLine,
      legalLine: content.legalLine,
    }),
  });
}
