import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

const columns = [
  {
    title: "Quick Links",
    links: [
      ["Home", "/"],
      ["About", "/about"],
      ["Academics", "/academics"],
      ["Digital Learning", "/digital-learning"],
      ["Student Life", "/student-life"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Information",
    links: [
      ["Admissions", "/admissions"],
      ["News & Events", "/news-events"],
      ["FAQs", "/faqs"],
      ["Careers", "/careers"],
      ["Support", "/support"],
    ],
  },
  {
    title: "Portal",
    links: [
      ["Student Portal", "/digital-school/student-portal"],
      ["Parent Portal", "/digital-school/parent-portal"],
      ["Teacher Portal", "/digital-school/teacher-portal"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="tss-footer">
      <div className="tss-container tss-footer-grid">
        <div className="tss-footer-brand">
          <a href="/" aria-label={`${BRAND.name} home`}>
            <Logo variant="light" />
          </a>
          <p>Future-ready learning for confident, capable and caring young people.</p>
          <div className="tss-socials" aria-label="Social media">
            <a href="/contact" aria-label="Facebook contact">
              f
            </a>
            <a href="/contact" aria-label="Instagram contact">
              ◎
            </a>
            <a href="/contact" aria-label="YouTube contact">
              ▶
            </a>
            <a href="/contact" aria-label="LinkedIn contact">
              in
            </a>
          </div>
        </div>

        {columns.map((column) => (
          <nav aria-label={column.title} key={column.title}>
            <h2>{column.title}</h2>
            {column.links.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
        ))}

        <div className="tss-footer-contact">
          <h2>Contact Us</h2>
          <a href="/contact">
            <Phone aria-hidden /> Official phone to be provided
          </a>
          <a href="/contact">
            <Mail aria-hidden /> Official email to be provided
          </a>
          <a href="/find-a-campus">
            <MapPin aria-hidden /> Official address to be provided
          </a>
        </div>
      </div>

      <div className="tss-footer-rule">
        <div className="tss-container tss-footer-bottom">
          <span>
            © {new Date().getFullYear()} {BRAND.shortName}. All rights reserved.
          </span>
          <nav aria-label="Legal">
            <a href="/privacy">Privacy Policy</a>
            <a href="/privacy#terms">Terms & Conditions</a>
            <a href="/privacy#cookies">Cookie Policy</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
