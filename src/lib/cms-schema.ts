/**
 * Plain-language metadata for the CMS.
 *
 * The CMS stores content as JSON, but an administrator must never see a
 * snake_case key, a curly brace, or the word "slug". Everything in this file
 * maps the stored shape onto human labels, helper text, and field types.
 */

export type FieldKind = "text" | "textarea" | "link" | "image" | "list";

/* ── Pages ──────────────────────────────────────────────────────────────── */

export const PAGE_LABELS: Record<string, string> = {
  home: "Home",
  about: "About",
  programs: "Programs",
  schools: "Schools",
  students: "Students",
  news: "News",
  contact: "Contact",
  careers: "Careers",
  emails: "Emails",
};

export function pageLabel(slug: string): string {
  return PAGE_LABELS[slug] ?? humanize(slug);
}

export function pagePath(slug: string): string {
  if (slug === "home") return "/";
  // The "Emails" CMS page isn't a real public route — it's a container for
  // confirmation-email copy, previewed at /email-preview instead.
  if (slug === "emails") return "/email-preview";
  return `/${slug}`;
}

/* ── Sections ───────────────────────────────────────────────────────────── */

export const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  channels: "Direct Channels",
  paths: "Which Path Is Yours",
  response: "Response Expectation",
  who_we_are: "Who We Are",
  core_domains: "Core Domains",
  four_programs: "Four Programs",
  faculty: "Faculty & Instructors",
  system_status: "System Status",
  classrooms: "Classroom Glimpse",
  for_schools: "For Schools",
  partners: "Institutional Partners",
  final_cta: "Final Call To Action",
  footer: "Footer",
  delivery_spec: "Delivery Specification",
  framework: "Three-Stage Framework",
  curriculum_scale: "Curriculum Scale",
  kits: "Kits & Materials",
  assessment: "Assessment & Reporting",
  requirements: "Campus Requirements",
  training: "Teacher Training & Support",
  exclusions: "Offered Separately",
  proof_cta: "Partner Schools & Enquiry",
  intro: "Introduction",
  details: "Details",
  tracks: "Age Tracks",
  session_shape: "What A Session Looks Like",
  student_builds: "What Students Build",
  closing_cta: "Closing Call To Action",
  positioning: "Positioning",
  vision_mission: "Vision & Mission",
  ecosystem: "Ecosystem & Affiliations",
  how_we_teach: "How We Teach",
  leadership: "Leadership & Team",
  regional_reach: "Regional Reach",
  featured: "Featured Project",
  gallery: "Project Gallery",
  progression: "How Projects Progress",
  why: "What You'd Be Joining",
  roles: "Open Roles",
  apply: "Application Form",
  closing: "Closing Line",
  parent_inquiry: "Parent Inquiry Confirmation",
  school_inquiry: "School Inquiry Confirmation",
  general_inquiry: "General Inquiry Confirmation",
  job_application: "Job Application Confirmation",
  camp_registration: "Camp Registration Confirmation",
};

export const SECTION_DESCRIPTIONS: Record<string, string> = {
  hero: "The first screen visitors see, with the headline and main buttons.",
  who_we_are: "The short positioning block underneath the hero.",
  core_domains: "The three-discipline explainer with its selector.",
  four_programs: "The programme cards block. The cards themselves live under Content › Programs.",
  faculty: "Credibility block about who teaches. Figures live under Content › Faculty Details.",
  system_status: "The live activity strip. Numbers come from Site-wide › Statistics.",
  classrooms: "The scrolling classroom strip. Images come from Content › Projects.",
  for_schools: "The progression ladder and school checklist.",
  partners: "Partner school strip and testimonials.",
  final_cta: "The closing invitation before the footer.",
  footer:
    "Footer contact block and social links. On the Emails page, the do-not-reply notice shown at the bottom of every confirmation email.",
  delivery_spec: "The specification table describing how the programme runs week to week.",
  framework: "The three progression stages, from Foundation through Engineering.",
  curriculum_scale:
    "The module counts across the three disciplines, plus the curriculum-on-request line.",
  kits: "What each grade group receives, and what is included in the subscription.",
  assessment: "How students are assessed and what reporting the school receives.",
  requirements: "What the campus needs to provide for effective delivery.",
  training: "Training sessions and implementation support offered to school staff.",
  exclusions: "Everything offered under separately agreed terms rather than the subscription.",
  proof_cta:
    "Partner badges, the testimonial slot and the closing enquiry invitation. Schools come from Content › Partner Schools; the quote comes from Content › Testimonials.",
  tracks: "The three age tracks shown on the Programs page.",
  session_shape: "The three session phases and the tools students use.",
  student_builds:
    "The build examples strip. The projects themselves live under Content › Projects.",
  closing_cta: "The two closing paths — one for parents, one for schools.",
  positioning: "The institutional positioning block. Figures come from Site-wide › Statistics.",
  vision_mission: "The vision and mission statements.",
  ecosystem: "The affiliation columns. The organisations live under Content › Affiliations.",
  how_we_teach: "The eight teaching methods and the three session phases.",
  leadership: "The people block. Leadership and team members live under Content › People.",
  regional_reach: "The regional delivery partnership block.",
  featured:
    "The large highlighted build at the top of the Students page. Choose which project is featured under Content › Projects.",
  gallery: "The filterable build log. The projects themselves live under Content › Projects.",
  photo_gallery:
    "The classroom photo gallery. The photographs themselves live under Content › Gallery.",
  progression: "The three age stages shown beneath the gallery.",
  channels:
    "The three direct contact cards. The numbers and address themselves live under Site-wide › Contact Details.",
  paths: "The two signposts that send parents and schools to the right page.",
  response: "The single closing line. The wording comes from Site-wide › Contact Details.",
  featured_students:
    "The student showcase at the foot of the Students page. The students themselves live under Content › Featured Students.",
  why: "The four reasons to join, shown above the role list on the Careers page.",
  roles:
    "The heading above the role list, plus the wording shown when no roles are open. The roles themselves live under Content › Job Openings.",
  apply: "The heading and confirmation wording around the application form.",
  closing: "The invitation to apply speculatively at the foot of the Careers page.",
  parent_inquiry: "The confirmation email sent when a parent submits the Contact form.",
  school_inquiry: "The confirmation email sent when a school submits a partnership inquiry.",
  general_inquiry: "The confirmation email sent for any other Contact-form message.",
  job_application: "The confirmation email sent after a careers application.",
  camp_registration: "The confirmation email sent after a camp registration.",
};

export function sectionLabel(key: string): string {
  return SECTION_LABELS[key] ?? humanize(key);
}

/* ── Fields ─────────────────────────────────────────────────────────────── */

interface FieldMeta {
  label: string;
  help?: string;
  kind?: FieldKind;
}

export const FIELD_META: Record<string, FieldMeta> = {
  /* Contact page */
  form_title: { label: "Form heading", help: "The small label above the inquiry form." },
  form_note: { label: "Note beside the send button", kind: "textarea" },
  block_4_title: { label: "Fourth block — heading" },
  block_4_body: { label: "Fourth block — text", kind: "textarea" },
  block_3_title: { label: "Third block — heading" },
  block_3_body: { label: "Third block — text", kind: "textarea" },
  block_2_title: { label: "Second block — heading" },
  block_2_body: { label: "Second block — text", kind: "textarea" },
  block_1_title: { label: "First block — heading" },
  block_1_body: { label: "First block — text", kind: "textarea" },
  empty_title: {
    label: "Heading when nothing is listed",
    help: "Shown on the Careers page when no roles are open.",
  },
  empty_body: { label: "Message when nothing is listed", kind: "textarea" },
  general_option: {
    label: "Wording for a general application",
    help: "The first choice in the role dropdown on the application form.",
  },
  block_1_stat_key: {
    label: "Statistic to show",
    help: "Which headline number appears in the first block. Numbers live under Site-wide › Statistics.",
  },
  assurance_1: { label: "Reassurance line 1", help: "Shown as a ticked line under the form." },
  assurance_2: { label: "Reassurance line 2" },
  assurance_3: { label: "Reassurance line 3" },
  submit_label: { label: "Send button wording" },
  success_title: {
    label: "Confirmation heading",
    help: "Shown after a message is sent successfully.",
  },
  success_body: { label: "Confirmation message", kind: "textarea" },
  error_title: { label: "Failure heading", help: "Shown when a message could not be sent." },
  error_body: { label: "Failure message", kind: "textarea" },
  whatsapp_note: { label: "WhatsApp card description", kind: "textarea" },
  whatsapp_badge: {
    label: "WhatsApp badge",
    help: "The small tag on the WhatsApp card, e.g. Fastest.",
  },
  email_label: { label: "Email card title" },
  email_note: { label: "Email card description", kind: "textarea" },
  visit_label: { label: "Visit card title" },
  visit_note: { label: "Visit card description", kind: "textarea" },
  parent_body: { label: "Parent signpost description", kind: "textarea" },
  /* Email templates */
  subject: { label: "Subject line", help: "Shown in the recipient's inbox before they open it." },
  notice: {
    label: "Do-not-reply notice",
    kind: "textarea",
    help: "Shown at the bottom of every confirmation email.",
  },
  steps_heading: { label: "Steps heading", help: "The small label above the numbered steps." },
  steps_heading_confirmed: {
    label: "Steps heading — confirmed",
    help: "Shown above the steps when a seat is confirmed (not waitlisted).",
  },
  steps_heading_waitlisted: {
    label: "Steps heading — waitlisted",
    help: "Shown above the steps when a registration is waitlisted.",
  },
  hint_text: {
    label: "Closing hint",
    kind: "textarea",
    help: "The line shown before the buttons.",
  },
  whatsapp_line: {
    label: "WhatsApp closing line",
    kind: "textarea",
    help: 'The line at the very end of the email. Keep the word "WhatsApp" in the sentence — it automatically becomes the clickable link.',
  },
  footer_note: {
    label: "Footer — why they received this",
    kind: "textarea",
    help: 'Shown in the footer, e.g. "You are receiving this because...". Clear it to remove the line entirely.',
  },
  contact_line: {
    label: "Footer — contact line",
    kind: "textarea",
    help: 'Shown in every email\'s footer. Keep the word "WhatsApp" and the reply email address (set under Site-wide › Contact Details) in the sentence — both automatically become clickable links. Clear it to remove the line entirely.',
  },
  address_line: {
    label: "Footer — address line",
    kind: "textarea",
    help: 'Shown in every email\'s footer. Keep "astrobotacademy.com" in the sentence to keep it clickable. Clear it to remove the line entirely.',
  },
  legal_line: {
    label: "Footer — legal line",
    kind: "textarea",
    help: "The affiliation line at the very bottom of every email. Clear it to remove the line entirely.",
  },
  n: { label: "Step number", help: "Shown as “Step 01” etc." },
  /* Headlines and copy */
  eyebrow: {
    label: "Small label above the headline",
    help: "The short line in capitals that sits above the main heading.",
  },
  headline: { label: "Headline", help: "The main heading for this section." },
  headline_gradient: {
    label: "Highlighted words",
    help: "These appear in the accent colour, directly after the headline.",
  },
  headline_before: { label: "Headline — first part", help: "Text before the highlighted words." },
  headline_after: { label: "Headline — last part", help: "Text after the highlighted words." },
  subhead: {
    label: "Subheading",
    kind: "textarea",
    help: "The supporting sentence under the headline.",
  },
  body: { label: "Body text", kind: "textarea", help: "The main paragraph shown in this section." },
  hook: {
    label: "Opening line",
    kind: "textarea",
    help: "The short lead-in paragraph for this section.",
  },
  heading: { label: "Heading", help: "The main heading for this section." },
  copy: {
    label: "Description",
    kind: "textarea",
    help: "Shown inside this card on the live page.",
  },
  desc: {
    label: "Description",
    kind: "textarea",
    help: "The longer description shown when this item is selected.",
  },
  selectorDesc: {
    label: "Short description",
    kind: "textarea",
    help: "The one-line summary shown in the selector strip.",
  },
  tagline: { label: "Tagline", help: "A single memorable line shown beneath the title." },
  title: { label: "Title", help: "The name shown at the top of this item." },
  label: { label: "Label", help: "The short caption shown on the live page." },
  kicker: { label: "Category label", help: "The small capitalised label above the title." },
  code: { label: "Number badge", help: "The small sequence number shown on the card, e.g. 01." },
  status: { label: "Status word", help: "Shown in the status strip, e.g. ONLINE." },
  value: { label: "Value", help: "The figure or wording shown on the live page." },
  outcome: { label: "Outcome", kind: "textarea", help: "What students achieve at this stage." },
  grades: { label: "Grade range", help: "Shown next to the stage name, e.g. Grade 3–5." },
  phase: { label: "Stage name", help: "The name of this stage on the progression ladder." },
  stageLabel: { label: "Stage badge", help: "The small badge above the stage name." },
  bullets: { label: "Bullet points", help: "Listed under the description on the live page." },
  badges: { label: "Credential badges", help: "The small pills shown under the faculty block." },
  note: {
    label: "Note",
    kind: "textarea",
    help: "The closing line shown underneath this section.",
  },
  closing_line: {
    label: "Closing line",
    kind: "textarea",
    help: "The sentence shown just above the final button.",
  },
  placeholder_note: {
    label: "Placeholder note",
    kind: "textarea",
    help: "Shown to visitors while these figures are marked as not final.",
  },
  unconfirmed_note: {
    label: "Unconfirmed note",
    help: "Shown on any project whose description is not confirmed yet.",
  },
  testimonial_placeholder_note: {
    label: "Placeholder testimonial note",
    kind: "textarea",
    help: "Shown under testimonials that are still placeholders.",
  },

  /* Buttons and links */
  cta_label: { label: "Button label", help: "The wording on the button." },
  cta_target: {
    label: "Button links to",
    kind: "link",
    help: "Where visitors go when they press the button.",
  },
  primary_cta_label: { label: "Main button label", help: "The wording on the primary button." },
  primary_cta_target: {
    label: "Main button links to",
    kind: "link",
    help: "Where the primary button sends visitors.",
  },
  secondary_cta_label: {
    label: "Second button label",
    help: "The wording on the outlined button next to the main one.",
  },
  secondary_cta_target: {
    label: "Second button links to",
    kind: "link",
    help: "Where the second button sends visitors.",
  },
  link_label: { label: "Text link label", help: "The wording of the inline text link." },
  link_target: {
    label: "Text link goes to",
    kind: "link",
    help: "Where the inline text link sends visitors.",
  },
  href: { label: "Link address", kind: "link", help: "Where this link sends visitors." },
  mission_control_label: {
    label: "Staff login link label",
    help: "Shown in the footer for staff sign-in.",
  },
  mission_control_target: { label: "Staff login link goes to", kind: "link" },

  /* Section-specific extras */
  doc_ref: {
    label: "Document reference",
    help: "The small brief reference printed across the top of the hero.",
  },
  doc_rev: {
    label: "Revision label",
    help: "The revision code shown on the right of the hero rule, e.g. Rev. 2026.1.",
  },
  systems_title: {
    label: "Status panel title",
    help: "The heading of the small status panel in the hero.",
  },
  systems_footer: {
    label: "Status panel footer",
    help: "The reassurance line at the bottom of the status panel.",
  },
  systems_status: {
    label: "Status panel state",
    help: "The short state word shown in the corner, e.g. GO.",
  },
  affiliation_label: {
    label: "Affiliation label",
    help: "The small caption above the affiliation name.",
  },
  affiliation_value: {
    label: "Affiliation name",
    help: "The organisation shown in the hero affiliation line.",
  },
  academy_footer_label: {
    label: "Partner programme label",
    help: "The caption above the partner programme card.",
  },
  dossier_label: {
    label: "Dossier caption",
    help: "The small live caption on the faculty dossier panel.",
  },
  panel_label: { label: "Panel caption", help: "The caption shown above the classroom strip." },
  ladder_label: { label: "Ladder caption", help: "The caption above the progression ladder." },
  ladder_range: {
    label: "Ladder range",
    help: "The grade span shown next to the ladder caption, e.g. ECE → Grade 8.",
  },
  public_label: {
    label: "Public programme badge",
    help: "The badge shown on programmes open to families.",
  },
  school_label: {
    label: "School programme badge",
    help: "The badge shown on the programme delivered inside schools.",
  },
  public_cta_label: {
    label: "Family button label",
    help: "The button on the three public programme cards.",
  },
  public_cta_target: { label: "Family button goes to", kind: "link" },
  school_cta_label: {
    label: "School button label",
    help: "The button on the school programme card.",
  },
  school_cta_target: { label: "School button goes to", kind: "link" },
  tools_label: {
    label: "Tools heading",
    help: "The caption above the list of tools students use.",
  },
  parent_title: {
    label: "Parents panel heading",
    help: "The caption on the closing panel aimed at families.",
  },
  parent_copy: {
    label: "Parents panel text",
    kind: "textarea",
    help: "The wording inside the parents panel.",
  },
  school_title: {
    label: "Schools panel heading",
    help: "The caption on the closing panel aimed at schools.",
  },
  school_copy: {
    label: "Schools panel text",
    kind: "textarea",
    help: "The wording inside the schools panel.",
  },
  whatsapp_label: {
    label: "WhatsApp link label",
    help: "The wording of the WhatsApp link under the main button.",
  },
  stats_label: { label: "Figures panel heading", help: "The caption above the key figures panel." },
  vision_label: { label: "Vision panel heading", help: "The caption on the vision panel." },
  vision: {
    label: "Vision statement",
    kind: "textarea",
    help: "The vision wording shown on the live page.",
  },
  mission_label: { label: "Mission panel heading", help: "The caption on the mission panel." },
  mission: {
    label: "Mission statement",
    kind: "textarea",
    help: "The mission wording shown on the live page.",
  },
  national_label: {
    label: "National column heading",
    help: "The heading above the national organisations.",
  },
  international_label: {
    label: "International column heading",
    help: "The heading above the international organisations.",
  },
  methods_label: { label: "Methods heading", help: "The caption above the teaching methods grid." },
  phases_label: {
    label: "Session structure heading",
    help: "The caption above the three session phases.",
  },
  team_eyebrow: {
    label: "Team — small label",
    help: "The short capitalised line above “The Team”.",
  },
  team_headline: { label: "Team — headline", help: "The heading for the compact team grid." },
  team_subhead: {
    label: "Team — subheading",
    kind: "textarea",
    help: "Optional supporting line under the team heading.",
  },
  partner_label: { label: "Partner caption", help: "The caption above the delivery partner name." },
  partner_name: { label: "Partner name", help: "The delivery partner shown on the live page." },

  /* Lists */
  items: { label: "Items", kind: "list" },
  stats: { label: "Figures", kind: "list" },
  systems: { label: "Status rows", kind: "list" },
  domains: { label: "Disciplines", kind: "list" },
  stages: { label: "Stages", kind: "list" },
  checklist: { label: "Checklist", kind: "list" },
  socials: { label: "Social links", kind: "list" },
  phases: { label: "Session phases", kind: "list" },
  methods: { label: "Teaching methods", kind: "list" },
  steps: { label: "Steps", kind: "list" },
  steps_confirmed: { label: "Steps — confirmed", kind: "list" },
  steps_waitlisted: { label: "Steps — waitlisted", kind: "list" },
  tools: { label: "Tools", kind: "list" },
  facts: { label: "Figures", kind: "list" },

  /* Media */
  image: { label: "Image", kind: "image" },
  media_id: { label: "Image", kind: "image" },
  filter_all_label: { label: "“All” filter label", help: "The wording on the first filter chip." },
  robotics_label: {
    label: "Robotics filter label",
    help: "The wording on the Robotics filter chip.",
  },
  ai_label: {
    label: "AI filter label",
    help: "The wording on the Artificial Intelligence filter chip.",
  },
  space_label: {
    label: "Space filter label",
    help: "The wording on the Space Science filter chip.",
  },
  photo_pending_label: {
    label: "Missing photo caption",
    help: "Shown in place of a picture on projects that have not been photographed yet.",
  },
  empty_label: {
    label: "Empty filter message",
    help: "Shown when a discipline filter has no projects.",
  },
  parent_label: {
    label: "Parents panel heading",
    help: "The caption on the closing panel aimed at families.",
  },
  parent_cta_label: { label: "Parents button label", help: "The button in the parents panel." },
  parent_cta_target: { label: "Parents button goes to", kind: "link" },
  logo_media_id: { label: "Logo", kind: "image" },
};

export const LIST_HELP: Record<string, string> = {
  specs: "Each entry becomes one row in the specification table.",
  facts: "Each entry becomes one figure in the summary strip.",
  items: "Each entry becomes one card on the live page.",
  stats: "Each entry becomes one figure in the hero.",
  systems: "Each entry becomes one row in the hero status panel.",
  domains: "Each entry becomes one discipline in the selector.",
  stages: "Each entry becomes one rung on the progression ladder.",
  checklist: "Each entry becomes one ticked line in the school checklist.",
  socials: "Each entry becomes one social icon in the footer.",
  bullets: "Each entry becomes one bullet under the description.",
  badges: "Each entry becomes one small pill under the faculty block.",
  phases: "Each entry becomes one phase of the session on the live page.",
  methods: "Each entry becomes one teaching method on the live page.",
  tools: "Each entry becomes one tool in the tools list.",
  steps: "Each entry becomes one numbered step in the email.",
  steps_confirmed: "Shown when a registration is confirmed (not waitlisted).",
  steps_waitlisted: "Shown when a registration is waitlisted.",
};

export const LIST_ITEM_NOUN: Record<string, string> = {
  specs: "specification row",
  facts: "figure",
  items: "item",
  stats: "figure",
  systems: "status row",
  domains: "discipline",
  stages: "stage",
  checklist: "checklist line",
  socials: "social link",
  bullets: "bullet",
  badges: "badge",
  phases: "phase",
  methods: "method",
  tools: "tool",
  steps: "step",
  steps_confirmed: "step",
  steps_waitlisted: "step",
};

/* ── Global settings ────────────────────────────────────────────────────── */

export const SETTING_META: Record<string, FieldMeta> = {
  contact_email: { label: "Contact email", help: "Shown in the footer and used on contact links." },
  email_contact_address: {
    label: "Confirmation email — reply address",
    help: "Shown in every confirmation email's footer. Kept separate from Contact email above so the two can point to different mailboxes if one has delivery trouble.",
  },
  email_from_address: {
    label: "Confirmation email — sender address",
    help: "The address confirmation emails appear to come from. Conventionally a no-reply address — the reply address above is where recipients are told to actually write.",
  },
  phone: { label: "Phone number", help: "Shown in the footer contact block." },
  whatsapp: { label: "WhatsApp number", help: "Displayed next to the WhatsApp link." },
  whatsapp_url: {
    label: "WhatsApp link address",
    help: "The full address the WhatsApp button opens.",
  },
  address: {
    label: "Postal address",
    kind: "textarea",
    help: "Shown in the footer contact block.",
  },
  site_tagline: { label: "Site tagline", help: "The one-line description of the academy." },
  footer_blurb: {
    label: "Footer introduction",
    kind: "textarea",
    help: "The paragraph at the top of the footer.",
  },
  institutional_line: {
    label: "Institutional footer line",
    help: "The legal / affiliation line at the very bottom of every page.",
  },
  response_time_note: {
    label: "Response time note",
    help: "Shown next to the closing call to action.",
  },
  social_instagram: { label: "Instagram address", help: "Leave empty to hide the Instagram link." },
  social_linkedin: { label: "LinkedIn address", help: "Leave empty to hide the LinkedIn link." },
};

/* ── Helpers ────────────────────────────────────────────────────────────── */

export function humanize(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function fieldMeta(key: string): FieldMeta {
  return FIELD_META[key] ?? { label: humanize(key) };
}

export function settingMeta(key: string): FieldMeta {
  return SETTING_META[key] ?? { label: humanize(key) };
}

const TEXTAREA_HINTS = /(body|copy|desc|description|subhead|hook|note|quote|blurb|outcome)/i;

export function inferKind(key: string, value: unknown): FieldKind {
  const declared = FIELD_META[key]?.kind;
  if (Array.isArray(value)) return "list";
  if (declared) return declared;
  if (/(_target$|^href$)/.test(key)) return "link";
  if (/(media_id$|^image$|_image$)/.test(key)) return "image";
  if (typeof value === "string" && (TEXTAREA_HINTS.test(key) || value.length > 90))
    return "textarea";
  return "text";
}

/** A friendly one-line summary of a section's current content. */
export function sectionPreview(content: Record<string, unknown>): string {
  for (const key of [
    "headline",
    "heading",
    "title",
    "eyebrow",
    "subhead",
    "body",
    "panel_label",
    "subject",
    "notice",
  ]) {
    const v = content[key];
    if (typeof v === "string" && v.trim()) {
      const gradient = content.headline_gradient;
      if (key === "headline" && typeof gradient === "string" && gradient.trim()) {
        return `${v} ${gradient}`.trim();
      }
      return v;
    }
  }
  return "No headline set yet";
}
