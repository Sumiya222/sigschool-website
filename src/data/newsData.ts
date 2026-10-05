import placeholderImage from "@/assets/signature-school-hero-v2.png";
import campusImage from "@/assets/hero-gallery-camps.webp";
import learnersImage from "@/assets/hero-gallery-early.webp";

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  image: string;
  shortDescription: string;
  content: readonly string[];
  gallery: readonly string[];
  placeholder: boolean;
}

export const newsArticles: readonly NewsArticle[] = [
  {
    id: "news-1",
    slug: "new-digital-learning-resources",
    title: "New digital learning resources now available",
    category: "News",
    date: "Apr 15, 2026",
    image: placeholderImage,
    shortDescription: "An update on digital learning resources for the school community.",
    content: [
      "Signature School is expanding its collection of digital learning resources to support classroom teaching, guided practice and independent learning.",
      "The resource collection is designed to help teachers present concepts clearly and give students more opportunities to explore, practise and review their learning. Access instructions and the confirmed release schedule will be shared through official school channels.",
    ],
    gallery: [placeholderImage],
    placeholder: true,
  },
  {
    id: "event-1",
    slug: "science-innovation-fair-2026",
    title: "Science & Innovation Fair 2026",
    category: "Event",
    date: "May 10, 2026",
    image: campusImage,
    shortDescription:
      "Students explore scientific thinking through models, experiments and creative projects.",
    content: [
      "The Science & Innovation Fair brings students together to investigate real-world questions, develop working ideas and communicate what they have learned.",
      "The programme is planned to include student exhibits, guided demonstrations and opportunities for families to view projects. Final timings, participation categories and visitor arrangements require school approval.",
    ],
    gallery: [campusImage],
    placeholder: true,
  },
  {
    id: "announcement-1",
    slug: "admissions-open-2026-27",
    title: "Admissions open for 2026–27",
    category: "Announcement",
    date: "Apr 5, 2026",
    image: learnersImage,
    shortDescription: "Admission enquiries are being welcomed for the 2026–27 academic cycle.",
    content: [
      "Families interested in joining Signature School can begin by reviewing the admission procedure and submitting the online enquiry form.",
      "Placement remains subject to the school's approved age criteria, documentation requirements, campus availability and assessment process. Confirmed deadlines and fee information must be obtained directly from the school.",
    ],
    gallery: [learnersImage],
    placeholder: true,
  },
];

export function getNewsArticle(slug: string) {
  return newsArticles.find((article) => article.slug === slug);
}
