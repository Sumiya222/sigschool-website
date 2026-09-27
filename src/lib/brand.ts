// Single source of truth for placeholder brand identity. Swap these values
// (and the color tokens in src/styles.css) when a real brand is finalized —
// everything else (email templates, PDFs, meta tags, footer, etc.) derives
// from this file rather than hardcoding the name/contact info again.
export const BRAND = {
  name: "Northbridge Preparatory School",
  shortName: "Northbridge Prep",
  legalName: "Northbridge Preparatory School",
  tagline: "Where Every Student Finds Their Path",
  domain: "northbridgeprep.edu",
  contactEmail: "hello@northbridgeprep.edu",
  admissionsEmail: "admissions@northbridgeprep.edu",
  careersEmail: "careers@northbridgeprep.edu",
  phone: "+1 (555) 010-2040",
  addressLine: "100 Founders Way, Springfield",
  portalLabel: "Staff & Family Portal",
  divisions: [
    { label: "Lower School", range: "Kindergarten – Grade 5" },
    { label: "Middle School", range: "Grades 6 – 8" },
    { label: "Upper School", range: "Grades 9 – 12" },
  ],
} as const;
