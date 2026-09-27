import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { list, setting, str, useSection, useSiteContent } from "@/lib/site-content";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

// Fallback only — nav_items is the source of truth. One link per destination.
const EXPLORE_LINKS = [
  { to: "/about", label: "About" },
  { to: "/programs", label: "Academics" },
  { to: "/admissions", label: "Admissions" },
  { to: "/schools", label: "Campus Life" },
  { to: "/students", label: "Student Life" },
  { to: "/careers", label: "Careers" },
  { to: "/contact", label: "Contact" },
] as const;

const SOCIALS = [
  { href: "https://facebook.com", label: "Facebook", Icon: Facebook },
  { href: "https://instagram.com", label: "Instagram", Icon: Instagram },
  { href: "https://youtube.com", label: "YouTube", Icon: Youtube },
  { href: "https://linkedin.com", label: "LinkedIn", Icon: Linkedin },
] as const;

const SOCIAL_ICONS: Record<string, typeof Facebook> = {
  Facebook,
  Instagram,
  YouTube: Youtube,
  LinkedIn: Linkedin,
};

const FOOTER_COLUMN_ORDER = ["Company", "Learn"] as const;

export function Footer() {
  const { settings, navItems } = useSiteContent();
  const c = useSection("footer");

  const footerLinks = navItems
    .filter((n) => n.location === "footer" && n.visible)
    .sort((a, b) => a.order - b.order);

  const fallbackColumns = [
    {
      heading: "Explore",
      links: EXPLORE_LINKS.map((l) => ({ label: l.label, target: l.to as string })),
    },
  ];

  const columns =
    footerLinks.length > 0
      ? FOOTER_COLUMN_ORDER.filter((h) => footerLinks.some((l) => l.footer_column === h)).map(
          (heading) => ({
            heading,
            links: footerLinks
              .filter((l) => l.footer_column === heading)
              .map((l) => ({ label: l.label, target: l.target })),
          }),
        )
      : fallbackColumns;

  const socials = list<{ label: string; href: string }>(
    c,
    "socials",
    SOCIALS.map((s) => ({ label: s.label, href: s.href })),
  );

  const email = setting(settings, "contact_email", BRAND.contactEmail);
  const phone = setting(settings, "phone", BRAND.phone);
  const phoneUrl = setting(settings, "phone_url", `tel:${BRAND.phone.replace(/[^+\d]/g, "")}`);
  const address = setting(settings, "address", BRAND.addressLine);

  return (
    // Opaque near-black base — the persistent 3D scene ends here, it must not
    // read through the footer.
    <footer className="relative z-10 border-t border-cyan/10 bg-navy-950">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-20">
          {/* Brand */}
          <div className="lg:w-64 lg:shrink-0">
            <Link to="/" className="flex items-center" aria-label={`${BRAND.name} home`}>
              <Logo variant="light" className="h-9" />
            </Link>
            <p className="mt-4 max-w-xs text-small text-gray-mid">
              {setting(
                settings,
                "footer_blurb",
                `${BRAND.tagline} — a K-12 private school serving Lower, Middle and Upper School students.`,
              )}
            </p>
            <p className="mt-5 flex items-start gap-2.5 text-small text-gray-mid">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-cyan"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span>{address}</span>
            </p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-10 sm:grid-cols-4">
            {columns.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h2 className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-offwhite">
                  {col.heading}
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={`${col.heading}-${link.label}`}>
                      <Link
                        to={link.target}
                        className="text-small text-gray-mid transition-colors hover:text-cyan"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            {/* Follow */}
            <nav aria-label="Follow">
              <h2 className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-offwhite">
                Follow
              </h2>
              <ul className="mt-4 space-y-2.5">
                {socials.map(({ href, label }) => {
                  const Icon = SOCIAL_ICONS[label] ?? Facebook;
                  return (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 text-small text-gray-mid transition-colors hover:text-cyan"
                      >
                        <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                        {label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Contact */}
            <div>
              <h2 className="font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-offwhite">
                Contact
              </h2>
              <ul className="mt-4 space-y-3 text-small text-gray-mid">
                <li className="flex items-start gap-2.5">
                  <Mail
                    className="mt-0.5 size-4 shrink-0 text-cyan"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <a href={`mailto:${email}`} className="transition-colors hover:text-cyan">
                    {email}
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <Phone
                    className="mt-0.5 size-4 shrink-0 text-cyan"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <a href={phoneUrl} className="transition-colors hover:text-cyan">
                    {phone}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/10 pt-6 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-gray-mid/70 sm:flex-row sm:justify-between sm:text-left">
          <span className="text-center sm:text-left">
            {BRAND.legalName}
            {" · "}
            <Link to="/privacy" className="transition-colors hover:text-cyan">
              Privacy Policy
            </Link>
          </span>
          <div className="flex items-center gap-4">
            <Link
              to={str(c, "portal_target", "/dashboard/login")}
              className="group inline-flex items-center gap-2 text-gray-mid/50 transition-colors hover:text-cyan"
              aria-label={`${BRAND.portalLabel} login`}
            >
              <span
                aria-hidden="true"
                className="inline-block size-1 rounded-full bg-gray-mid/40 transition-colors group-hover:bg-cyan"
              />
              {str(c, "portal_label", BRAND.portalLabel)}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
