/** Shared careers constants and types — safe to import from browser code. */

export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship";

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
];

export type JobOpening = {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  description: string;
  responsibilities: string;
  requirements: string;
  posted_at: string;
  closes_at: string | null;
};

export const MAX_CV_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_CV_EXTENSIONS = ".pdf,.docx";
export const ACCEPTED_CV_LABEL = "PDF or DOCX · up to 10MB";
