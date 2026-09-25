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
  fromAddress: "noreply@astrobotacademy.com",
  whatsappUrl: "https://wa.me/923145978068",
  contactAddress: "info@astrobotacademy.com",
  footerNotice: "This inbox isn't monitored, so replies here won't reach us.",
  contactLine: "For anything else, message us on WhatsApp or write to info@astrobotacademy.com.",
  addressLine: "AstroBot Academy · NICAT–NASTP Alpha, Rawalpindi · astrobotacademy.com",
  legalLine: "Stellar Scholar Space Education Initiative · Stelalliance (SMC-Private) Ltd",
  parentInquiry: {
    subject: "We've got your question — AstroBot Academy",
    stepsHeading: "While you wait",
    steps: [
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
    ],
    ctaLabel: "Explore the programs",
    whatsappLine:
      "Prefer to talk it through instead? You're welcome to reach our team directly on WhatsApp.",
    footerNote: "You are receiving this because you sent an inquiry through our Contact page.",
  },
  schoolInquiry: {
    subject: "Your school partnership inquiry — AstroBot Academy",
    stepsHeading: "How the engagement runs",
    steps: [
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
    ],
    ctaLabel: "Read the delivery specification",
    whatsappLine:
      "If your academic calendar has a fixed decision date, let us know on WhatsApp and we will work backwards from it.",
    footerNote: "You are receiving this because your school submitted a partnership inquiry.",
  },
  generalInquiry: {
    subject: "Your message to AstroBot Academy",
    hintText:
      "In the meantime, the clearest picture of what we do is the student build log — real projects, documented as they were made.",
    primaryCtaLabel: "See student work",
    secondaryCtaLabel: "About the academy →",
    footerNote: "You are receiving this because you sent a message through our Contact page.",
  },
  jobApplication: {
    subject: "Your application to AstroBot Academy",
    stepsHeading: "Our process",
    steps: [
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
    ],
    closingLine:
      "You will hear from us either way. If the answer is no, we will tell you plainly rather than leave you waiting.",
    ctaLabel: "View all open roles",
    footerNote:
      "You are receiving this because you applied through the AstroBot Academy careers page.",
  },
  campRegistration: {
    subject: "Camp registration confirmed — AstroBot Academy",
    stepsHeadingConfirmed: "Before day one",
    stepsConfirmed: [
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
        body: "If a seat opens close to the start date, we phone the number you gave us first.",
      },
    ],
    ctaLabel: "View the program",
    whatsappLine: "Any questions before the camp? Our team is just a WhatsApp message away.",
    footerNote:
      "You are receiving this because you registered a child for an AstroBot Academy camp.",
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
