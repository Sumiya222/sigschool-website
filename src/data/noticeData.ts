export interface SchoolNotice {
  id: string;
  date: string;
  category: string;
  title: string;
  description: string;
  content: string;
  attachment?: string;
}

export const notices: readonly SchoolNotice[] = [
  {
    id: "school-communication-channels",
    date: "Effective throughout the academic year",
    category: "School Notice",
    title: "Important School Communication Notice",
    description:
      "Families are requested to use verified Signature School channels for official updates.",
    content:
      "Parents and guardians are requested to rely on the school portal, registered contact details and official Signature School notices for academic schedules, events, examinations and urgent updates. Please ensure that your email address and telephone number remain current with the school office. Do not rely on forwarded or unofficial messages; contact the school directly whenever an announcement needs verification.",
  },
  {
    id: "admissions-document-checklist",
    date: "[Official Date To Be Provided]",
    category: "Admissions Notice",
    title: "Admission Application Documents",
    description: "A reminder to prepare all required documents before application review.",
    content:
      "Applicants should complete every required section of the admission form and provide the documents requested by the school. The final document checklist, submission deadline and verification procedure must be confirmed by Signature School before applying.",
  },
  {
    id: "assessment-preparation-notice",
    date: "[Official Date To Be Provided]",
    category: "Academic Notice",
    title: "Assessment Preparation and Attendance",
    description: "Students should follow the official timetable and maintain regular attendance.",
    content:
      "Students are encouraged to review classroom learning regularly, complete assigned work and follow the assessment timetable issued through official school channels. Exact dates, syllabus coverage and examination instructions will be published only after academic approval.",
  },
];

export function getNotice(id: string) {
  return notices.find((notice) => notice.id === id);
}
