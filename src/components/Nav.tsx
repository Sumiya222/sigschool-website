import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

const groups = [
  {
    label: "About",
    href: "/about",
    items: [
      ["Vision & Mission", "/about/vision-mission"],
      ["Chairperson's Message", "/about/chairperson"],
      ["Signature School at a Glance", "/about/at-a-glance"],
      ["Teacher Training", "/about/teacher-training"],
      ["News & Events", "/about/news-events"],
      ["Alumni", "/about/alumni"],
      ["Important Notices", "/about/notices"],
      ["Signature School", "/about/signature-school"],
    ],
  },
  {
    label: "Academics",
    href: "/academics",
    items: [
      ["Academic Overview", "/academics"],
      ["Examinations", "/examinations"],
      ["Teacher Development", "/teacher-development"],
    ],
  },
  {
    label: "Learning",
    href: "/learn-to-earn",
    items: [
      ["Learn To Earn", "/learn-to-earn"],
      ["Digital Learning", "/digital-learning"],
      ["STEAM & Innovation", "/steam"],
      ["Leadership", "/leadership"],
      ["Student Wellbeing", "/student-wellbeing"],
      ["Student Life", "/student-life"],
    ],
  },
  {
    label: "Digital School",
    href: "/login",
    items: [
      ["Student Portal", "/digital-school/student-portal"],
      ["Parent Portal", "/digital-school/parent-portal"],
      ["Teacher Portal", "/digital-school/teacher-portal"],
    ],
  },
  {
    label: "Franchise",
    href: "/franchise",
    items: [
      ["Why Signature", "/franchise#why-signature"],
      ["Our Network", "/franchise#network"],
      ["Franchise Models", "/franchise#models"],
      ["Franchise Process", "/franchise#process"],
      ["Partner Support", "/franchise#support"],
      ["Technology", "/franchise#technology"],
      ["Become a Partner", "/franchise/apply"],
    ],
  },
  {
    label: "More",
    href: "/school",
    items: [
      ["Campuses", "/find-a-campus"],
      ["FAQs", "/faqs"],
      ["Support", "/support"],
      ["Contact", "/contact"],
    ],
  },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return (
    <header className="tss-header">
      <div className="tss-utility">
        <div className="tss-nav-wrap">
          <span>Signature School • Learn to Earn</span>
          <span>Digital-first learning for future-ready learners</span>
        </div>
      </div>
      <div className="tss-nav-wrap">
        <Link to="/" aria-label="The Signature School home">
          <Logo variant="dark" />
        </Link>
        <nav aria-label="Primary navigation" className="tss-desktop-nav">
          <a className={pathname === "/" ? "active" : ""} href="/">
            Home
          </a>
          {groups.map((group) => (
            <div className="tss-nav-group" key={group.label}>
              <a className={pathname.startsWith(group.href) ? "active" : ""} href={group.href}>
                {group.label}
                <ChevronDown aria-hidden className="size-3" />
              </a>
              <div
                className={`tss-dropdown ${group.label === "About" ? "tss-about-dropdown" : ""}`}
              >
                <div>
                  {group.items.map(([label, href]) => (
                    <a key={href} href={href}>
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>
        <div className="tss-nav-actions">
          <a href="/apply-online" className="tss-button tss-apply-button">
            Apply Now
          </a>
          <a href="/login" className="tss-login-button">
            Login Portal
          </a>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="tss-menu-button"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile navigation" className="tss-mobile-nav">
          <a href="/">Home</a>
          {groups.map((group) => (
            <details key={group.label}>
              <summary>{group.label}</summary>
              {group.items.map(([label, href]) => (
                <a key={href} href={href}>
                  {label}
                </a>
              ))}
            </details>
          ))}
          <a href="/login">Login Portal</a>
          <a href="/apply-online" className="tss-button">
            Apply Now
          </a>
        </nav>
      )}
    </header>
  );
}
