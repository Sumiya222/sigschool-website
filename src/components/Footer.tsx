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
            <a
              href={BRAND.social.facebook}
              target="_blank"
              rel="noreferrer"
              aria-label="The Signature Schools on Facebook"
            >
              f
            </a>
            <a
              href={BRAND.social.instagram}
              target="_blank"
              rel="noreferrer"
              aria-label="The Signature Schools on Instagram"
            >
              ◎
            </a>
            <a
              href={BRAND.social.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="The Signature School on LinkedIn"
            >
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
          <a href="tel:+923000515557">
            <Phone aria-hidden /> {BRAND.phone}
          </a>
          <a href={`mailto:${BRAND.contactEmail}`}>
            <Mail aria-hidden /> {BRAND.contactEmail}
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(BRAND.addressLine)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin aria-hidden /> {BRAND.addressLine}
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
