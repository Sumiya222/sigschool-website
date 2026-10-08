export const MISSING_CONTENT = "[TO BE PROVIDED BY SIGNATURE SCHOOL]";

export const BRAND = {
  name: "The Signature School",
  shortName: "Signature School",
  legalName: "The Signature School",
  tagline: "Learn, Lead and Grow",
  domain: MISSING_CONTENT,
  contactEmail: MISSING_CONTENT,
  admissionsEmail: MISSING_CONTENT,
  careersEmail: MISSING_CONTENT,
  phone: MISSING_CONTENT,
  addressLine: MISSING_CONTENT,
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
