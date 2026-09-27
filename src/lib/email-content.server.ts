/**
 * CMS-editable copy for confirmation emails (server-only).
 *
 * Only the generic wording — steps, CTA labels, subject lines, and every
 * line of the shared footer — comes from here. Personalized content
 * (heading, intro, the submission-record panel, waitlisted/confirmed
 * branching) stays in the template components themselves; a text-field CMS
 * has no safe way to represent that.
 *
 * Reads with the service-role client and never throws — any failure (or a
 * row simply not existing yet) falls back to the same wording the templates
 * shipped with, so a CMS hiccup can never block a transactional email.
 */
import { str, list, setting } from "@/lib/site-content";
import { BRAND } from "@/lib/brand";

/**
 * Like str(), but an intentionally-cleared field ("") is honored as blank
 * rather than falling back to the default — only a genuinely missing key
 * falls back. Every other CMS text field on the site treats blank as "not
 * customized yet" (so a headline can never accidentally go live empty), but
 * every footer line here is meant to be removable outright if an admin
 * clears it — the Shell component skips rendering an empty line entirely.
 */
function strAllowEmpty(obj: Record<string, unknown>, key: string, fallback: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : fallback;
}

export type EmailStep = { n: string; title: string; body: string };

export type EmailContent = {
  /** Sender identity Resend attaches to outgoing mail — deliberately
   * distinct from contactAddress, which is the real, monitored reply
   * address referenced in the footer's contact line. */
  fromAddress: string;
  whatsappUrl: string;
  contactAddress: string;
  /** Every line below is independently editable and independently
   * removable (clear the field to drop that line from every email). */
  footerNotice: string;
  contactLine: string;
  addressLine: string;
  legalLine: string;
  parentInquiry: {
    subject: string;
    stepsHeading: string;
    steps: EmailStep[];
    ctaLabel: string;
    whatsappLine: string;
    footerNote: string;
  };
  schoolInquiry: {
    subject: string;
    stepsHeading: string;
    steps: EmailStep[];
    ctaLabel: string;
    whatsappLine: string;
    footerNote: string;
  };
  generalInquiry: {
    subject: string;
    hintText: string;
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    footerNote: string;
  };
  jobApplication: {
    subject: string;
    stepsHeading: string;
    steps: EmailStep[];
    closingLine: string;
    ctaLabel: string;
    footerNote: string;
  };
  campRegistration: {
    subject: string;
    stepsHeadingConfirmed: string;
    stepsConfirmed: EmailStep[];
    stepsHeadingWaitlisted: string;
    stepsWaitlisted: EmailStep[];
    ctaLabel: string;
    whatsappLine: string;
    footerNote: string;
  };
};

export const DEFAULT_EMAIL_CONTENT: EmailContent = {
  fromAddress: `noreply@${BRAND.domain}`,
  whatsappUrl: `tel:${BRAND.phone.replace(/[^+\d]/g, "")}`,
  contactAddress: BRAND.contactEmail,
  footerNotice: "This inbox isn't monitored, so replies here won't reach us.",
  contactLine: `For anything else, call us or write to ${BRAND.contactEmail}.`,
  addressLine: `${BRAND.name} · ${BRAND.addressLine} · ${BRAND.domain}`,
  legalLine: BRAND.legalName,
  parentInquiry: {
    subject: `We've got your question — ${BRAND.name}`,
    stepsHeading: "While you wait",
    steps: [
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
    ],
    ctaLabel: "Explore admissions",
    whatsappLine: "Prefer to talk it through instead? You're welcome to call our admissions team.",
    footerNote: "You are receiving this because you sent an inquiry through our Contact page.",
  },
  schoolInquiry: {
    subject: `Your inquiry — ${BRAND.name}`,
    stepsHeading: "What happens next",
    steps: [
      {
        n: "01",
        title: "Intro call",
        body: "A short call to understand what you're looking for and point you to the right contact.",
      },
      {
        n: "02",
        title: "Follow-up",
        body: "We'll send any additional information relevant to your inquiry.",
      },
      {
        n: "03",
        title: "Next steps",
        body: "If a visit or meeting makes sense, we'll help arrange it.",
      },
    ],
    ctaLabel: "Learn more about us",
    whatsappLine: "If you have a deadline in mind, let us know and we'll work backwards from it.",
    footerNote: "You are receiving this because you submitted an inquiry.",
  },
  generalInquiry: {
    subject: `Your message to ${BRAND.name}`,
    hintText:
      "In the meantime, the clearest picture of what we do is our Academics and Campus Life pages.",
    primaryCtaLabel: "See academics",
    secondaryCtaLabel: "About the school →",
    footerNote: "You are receiving this because you sent a message through our Contact page.",
  },
  jobApplication: {
    subject: `Your application to ${BRAND.name}`,
    stepsHeading: "Our process",
    steps: [
      {
        n: "01",
        title: "Review — within one week",
        body: "We look for evidence you have taught and led real classrooms, not only studied education.",
      },
      {
        n: "02",
        title: "Conversation",
        body: "A relaxed call about your background, the age group you'd teach and your approach to the classroom.",
      },
      {
        n: "03",
        title: "Teaching demo",
        body: "Shortlisted candidates teach a short lesson with a real class. We pay for your time on the day.",
      },
    ],
    closingLine:
      "You will hear from us either way. If the answer is no, we will tell you plainly rather than leave you waiting.",
    ctaLabel: "View all open roles",
    footerNote: `You are receiving this because you applied through the ${BRAND.name} careers page.`,
  },
  campRegistration: {
    subject: `Enrollment received — ${BRAND.name}`,
    stepsHeadingConfirmed: "Before day one",
    stepsConfirmed: [
      {
        n: "01",
        title: "Check the details above",
        body: "Let us know right away if anything needs correcting — especially your child's grade, which sets their division and classroom.",
      },
      {
        n: "02",
        title: "Joining instructions",
        body: "Timings, the campus map, the drop-off and pick-up procedure and the supply list arrive closer to the start date.",
      },
      {
        n: "03",
        title: "What to bring",
        body: "Just a water bottle and curiosity. The supply list will follow separately.",
      },
    ],
    stepsHeadingWaitlisted: "What happens now",
    stepsWaitlisted: [
      {
        n: "01",
        title: "You keep your position",
        body: "Places move often as plans change. Your position is fixed by the time you registered.",
      },
      {
        n: "02",
        title: "We call before we email",
        body: "If a spot opens close to the start date, we phone the number you gave us first.",
      },
    ],
    ctaLabel: "View admissions",
    whatsappLine: "Any questions before the term starts? Our team is happy to help.",
    footerNote: `You are receiving this because you registered a child at ${BRAND.name}.`,
  },
};

export async function getEmailContent(): Promise<EmailContent> {
  const d = DEFAULT_EMAIL_CONTENT;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [sections, settings] = await Promise.all([
      supabaseAdmin.from("page_sections").select("section_key, content").eq("page_slug", "emails"),
      supabaseAdmin
        .from("site_settings")
        .select("key, value")
        .in("key", ["whatsapp_url", "email_contact_address", "email_from_address"]),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byKey: Record<string, Record<string, any>> = {};
    for (const row of sections.data ?? []) {
      byKey[row.section_key] = (row.content ?? {}) as Record<string, unknown>;
    }
    const settingMap: Record<string, string> = {};
    for (const row of settings.data ?? []) {
      const v = row.value;
      settingMap[row.key] = typeof v === "string" ? v : v == null ? "" : String(v);
    }

    const footer = byKey.footer ?? {};
    const pi = byKey.parent_inquiry ?? {};
    const si = byKey.school_inquiry ?? {};
    const gi = byKey.general_inquiry ?? {};
    const ja = byKey.job_application ?? {};
    const cr = byKey.camp_registration ?? {};

    return {
      fromAddress: setting(settingMap, "email_from_address", d.fromAddress),
      whatsappUrl: setting(settingMap, "whatsapp_url", d.whatsappUrl),
      contactAddress: setting(settingMap, "email_contact_address", d.contactAddress),
      footerNotice: strAllowEmpty(footer, "notice", d.footerNotice),
      contactLine: strAllowEmpty(footer, "contact_line", d.contactLine),
      addressLine: strAllowEmpty(footer, "address_line", d.addressLine),
      legalLine: strAllowEmpty(footer, "legal_line", d.legalLine),
      parentInquiry: {
        subject: str(pi, "subject", d.parentInquiry.subject),
        stepsHeading: str(pi, "steps_heading", d.parentInquiry.stepsHeading),
        steps: list<EmailStep>(pi, "steps", d.parentInquiry.steps),
        ctaLabel: str(pi, "cta_label", d.parentInquiry.ctaLabel),
        whatsappLine: str(pi, "whatsapp_line", d.parentInquiry.whatsappLine),
        footerNote: strAllowEmpty(pi, "footer_note", d.parentInquiry.footerNote),
      },
      schoolInquiry: {
        subject: str(si, "subject", d.schoolInquiry.subject),
        stepsHeading: str(si, "steps_heading", d.schoolInquiry.stepsHeading),
        steps: list<EmailStep>(si, "steps", d.schoolInquiry.steps),
        ctaLabel: str(si, "cta_label", d.schoolInquiry.ctaLabel),
        whatsappLine: str(si, "whatsapp_line", d.schoolInquiry.whatsappLine),
        footerNote: strAllowEmpty(si, "footer_note", d.schoolInquiry.footerNote),
      },
      generalInquiry: {
        subject: str(gi, "subject", d.generalInquiry.subject),
        hintText: str(gi, "hint_text", d.generalInquiry.hintText),
        primaryCtaLabel: str(gi, "primary_cta_label", d.generalInquiry.primaryCtaLabel),
        secondaryCtaLabel: str(gi, "secondary_cta_label", d.generalInquiry.secondaryCtaLabel),
        footerNote: strAllowEmpty(gi, "footer_note", d.generalInquiry.footerNote),
      },
      jobApplication: {
        subject: str(ja, "subject", d.jobApplication.subject),
        stepsHeading: str(ja, "steps_heading", d.jobApplication.stepsHeading),
        steps: list<EmailStep>(ja, "steps", d.jobApplication.steps),
        closingLine: str(ja, "closing_line", d.jobApplication.closingLine),
        ctaLabel: str(ja, "cta_label", d.jobApplication.ctaLabel),
        footerNote: strAllowEmpty(ja, "footer_note", d.jobApplication.footerNote),
      },
      campRegistration: {
        subject: str(cr, "subject", d.campRegistration.subject),
        stepsHeadingConfirmed: str(
          cr,
          "steps_heading_confirmed",
          d.campRegistration.stepsHeadingConfirmed,
        ),
        stepsConfirmed: list<EmailStep>(cr, "steps_confirmed", d.campRegistration.stepsConfirmed),
        stepsHeadingWaitlisted: str(
          cr,
          "steps_heading_waitlisted",
          d.campRegistration.stepsHeadingWaitlisted,
        ),
        stepsWaitlisted: list<EmailStep>(
          cr,
          "steps_waitlisted",
          d.campRegistration.stepsWaitlisted,
        ),
        ctaLabel: str(cr, "cta_label", d.campRegistration.ctaLabel),
        whatsappLine: str(cr, "whatsapp_line", d.campRegistration.whatsappLine),
        footerNote: strAllowEmpty(cr, "footer_note", d.campRegistration.footerNote),
      },
    };
  } catch (err) {
    console.error("[email-content] Falling back to built-in copy:", err);
    return d;
  }
}
