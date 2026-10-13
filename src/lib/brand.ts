export const MISSING_CONTENT = "[TO BE PROVIDED BY SIGNATURE SCHOOL]";

export const BRAND = {
  name: "The Signature School",
  shortName: "Signature School",
  legalName: "The Signature School",
  tagline: "Learn, Lead and Grow",
  domain: "thesignatureschool.com",
  contactEmail: "info@thesignatureschool.com",
  admissionsEmail: "info@thesignatureschool.com",
  careersEmail: "info@thesignatureschool.com",
  phone: "+92 300 0515557",
  addressLine:
    "Plot No. 11, Tulip Road, near Giga Mall, Gate No. 03, Facing GT Road, DHA Phase II, Islamabad, Pakistan",
  social: {
    facebook: "https://www.facebook.com/thesignatureschools/",
    instagram: "https://www.instagram.com/thesignatureschools/",
    linkedin: "https://www.linkedin.com/company/the-signature-school/",
  },
  portalLabel: "Digital School",
  divisions: [
    { label: "Early Years", range: MISSING_CONTENT },
    { label: "Primary", range: MISSING_CONTENT },
    { label: "Middle School", range: MISSING_CONTENT },
    { label: "Secondary", range: MISSING_CONTENT },
  ],
} as const;

export const BRAND_PILLARS = [
  "Academics",
  "Technology",
  "Financial Literacy",
  "Leadership & Character",
] as const;
export const LEARN_VALUES = [
  { letter: "L", title: "Leadership & Character" },
  { letter: "E", title: "Excellence in Education" },
  { letter: "A", title: "Ambition & Entrepreneurship" },
  { letter: "R", title: "Readiness for the Real World" },
  { letter: "N", title: "Novel Technology & Innovation" },
] as const;
