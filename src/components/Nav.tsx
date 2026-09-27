import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { cn } from "@/lib/utils";
import { useSiteContent } from "@/lib/site-content";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

// Fallback only — nav_items is the source of truth once the CMS has rows
// for the "nav" location. Without this, an empty/unseeded table renders no
// navbar at all instead of degrading gracefully (see Footer.tsx's
// EXPLORE_LINKS for the same pattern).
const FALLBACK_LINKS = [
  { to: "/about", label: "About" },
  { to: "/programs", label: "Academics" },
  { to: "/admissions", label: "Admissions" },
  { to: "/schools", label: "Campus Life" },
  { to: "/students", label: "Student Life" },
  { to: "/careers", label: "Careers" },
  { to: "/contact", label: "Contact" },
] as const;

export function Nav() {
  const { navItems } = useSiteContent();
  const cmsLinks: { to: string; label: string }[] = navItems
    .filter((n) => n.location === "nav" && n.visible)
    .sort((a, b) => a.order - b.order)
    .map((n) => ({ to: n.target, label: n.label }));
  const links = cmsLinks.length > 0 ? cmsLinks : FALLBACK_LINKS;

  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      style={{ top: "var(--announce-h, 0px)" }}
      className={cn(
        "fixed inset-x-0 z-50 transition-colors duration-200 ease-out",
        scrolled
          ? "border-b border-border bg-navy-950/95 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-18 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center"
          onClick={() => setOpen(false)}
          aria-label={`${BRAND.name} home`}
        >
          <Logo variant="light" className="h-9 sm:h-10 lg:h-11" />
        </Link>

        {/* Desktop links */}
        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2 text-small font-medium text-gray-mid transition-colors hover:text-offwhite"
              activeProps={{ className: "text-gold hover:text-gold" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: CTA + hamburger */}
        <div className="flex items-center gap-3">
          <Link
            to="/contact"
            className={cn(goldButtonClassName, "hidden px-5 py-2.5 lg:inline-flex")}
          >
            {GoldButtonSheen}
            <span className="relative inline-flex items-center gap-2">Inquire</span>
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-offwhite lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-18 z-40 flex flex-col bg-navy-950/98 px-6 py-8 backdrop-blur-lg lg:hidden"
          >
            <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
              {links.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.25 }}
                >
                  <Link
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 font-display text-subheading font-medium text-offwhite transition-colors hover:bg-navy-800"
                    activeProps={{ className: "text-gold" }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
            </nav>
            <div className="mt-8">
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className={cn(goldButtonClassName, "w-full")}
              >
                {GoldButtonSheen}
                <span className="relative inline-flex items-center gap-2">Inquire</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
