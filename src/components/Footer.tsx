import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { list, setting, str, useSection, useSiteContent } from "@/lib/site-content";
import astrobotLogo from "@/assets/astrobot-logo-light.webp";

// WhatsApp brand glyph — lucide ships no brand logos, so use an inline SVG.
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// Fallback only — nav_items is the source of truth. One link per destination.
const EXPLORE_LINKS = [
  { to: "/about", label: "About" },
  { to: "/programs", label: "Programs" },
  { to: "/schools", label: "Schools" },
  { to: "/students", label: "Students" },
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

  const email = setting(settings, "contact_email", "contact@astrobotacademy.com");
  const whatsapp = setting(settings, "whatsapp", "+92 314 5978068");
  const whatsappUrl = setting(settings, "whatsapp_url", "https://wa.me/923145978068");
  const address = setting(settings, "address", "NICAT-NASTP Alpha, Old Airport Road, Rawalpindi");
  const coordinates = setting(settings, "coordinates", "33.6007° N · 73.0679° E");

  return (
    // Opaque near-black base — the persistent 3D scene ends here, it must not
    // read through the footer.
    <footer className="relative z-10 border-t border-cyan/10 bg-navy-950">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-14 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-20">
          {/* Brand */}
          <div className="lg:w-64 lg:shrink-0">
            <Link to="/" className="flex items-center" aria-label="AstroBot Academy home">
              <img
                src={astrobotLogo}
                alt="AstroBot Academy"
                className="h-9 w-auto"
                draggable={false}
              />
            </Link>
            <p className="mt-4 max-w-xs text-small text-gray-mid">
              {setting(
                settings,
                "footer_blurb",
                "Robotics, AI & Space Science education for young innovators — from pre-school through Grade 8, across Pakistan.",
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
                  <WhatsAppIcon className="mt-0.5 size-4 shrink-0 text-cyan" />
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-cyan"
                  >
                    {whatsapp}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/10 pt-6 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-gray-mid/70 sm:flex-row sm:justify-between sm:text-left">
          <span className="text-center sm:text-left">
            <a
              href="https://stelalliance.com/portfolio/stellar-scholar"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-cyan"
            >
              Stellar Scholar Space Education Initiative
            </a>
            {" · "}
            <a
              href="https://stelalliance.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-cyan"
            >
              Stelalliance (SMC-Private) Ltd
            </a>
            {" · "}
            <Link to="/privacy" className="transition-colors hover:text-cyan">
              Privacy Policy
            </Link>
          </span>
          <div className="flex items-center gap-4">
            <span>{coordinates}</span>
            <Link
              to={str(c, "mission_control_target", "/dashboard/login")}
              className="group inline-flex items-center gap-2 text-gray-mid/50 transition-colors hover:text-cyan"
              aria-label="Mission Control — dashboard login"
            >
              <span
                aria-hidden="true"
                className="inline-block size-1 rounded-full bg-gray-mid/40 transition-colors group-hover:bg-cyan"
              />
              {str(c, "mission_control_label", "Mission Control")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
