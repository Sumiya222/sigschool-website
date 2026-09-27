import { motion } from "framer-motion";
import { ArrowUpRight, Briefcase, MessageSquare, Users } from "lucide-react";
import { Band, fadeUp, stagger } from "@/components/for-schools/Band";
import { ChannelRail, InquiryForm } from "./InquiryForm";
import { setting, str, useSection, useSiteContent } from "@/lib/site-content";
import { BRAND } from "@/lib/brand";

const SLUG = "contact";

type Theme = "dark" | "light";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeOf(c: Record<string, any>, fallback: Theme): Theme {
  return c.theme === "light" ? "light" : c.theme === "dark" ? "dark" : fallback;
}

/* ── 1 · Hero + form — dark ────────────────────────────────────────────── */

export function CtHero() {
  const c = useSection("hero", SLUG);
  const channels = useSection("channels", SLUG);
  const theme = themeOf(c, "dark");

  return (
    <Band theme={theme} label={`Contact ${BRAND.name}`} hero>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="pt-0 -mt-6 lg:-mt-10"
      >
        <motion.div
          variants={fadeUp}
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-foreground/12 py-3 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-gray-mid"
        >
          <span className="inline-flex items-center gap-2.5">
            <span
              aria-hidden
              className="led size-1.5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]"
            />
            {str(c, "doc_ref", "Inquiry Desk · NB / CNT")}
          </span>
          <span>{str(c, "doc_rev", "Rev. 2026.1")}</span>
        </motion.div>

        <div className="grid gap-12 pt-10 lg:min-h-[27rem] lg:grid-cols-[minmax(0,1fr)_34rem] lg:gap-16 lg:pt-14">
          <motion.div variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan"
            >
              {str(c, "eyebrow", "Contact")}
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-6 max-w-[22ch] font-display text-[2.5rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-[3.5rem] lg:text-[4.25rem]"
            >
              <span className="block">{str(c, "headline", "Inquire.")}</span>
              {str(c, "headline_gradient", "") ? (
                <span className="block bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
                  {str(c, "headline_gradient", "")}
                </span>
              ) : null}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-gray-mid"
            >
              {str(c, "subhead", "")}
            </motion.p>

            <ChannelRail content={channels} />
          </motion.div>

          <InquiryForm content={c} />
        </div>
      </motion.div>
    </Band>
  );
}

/* ── 2 · Where to start — light ────────────────────────────────────────── */

export function CtPaths() {
  const c = useSection("paths", SLUG);
  const theme = themeOf(c, "light");
  const light = theme === "light";

  const paths = [
    {
      index: "01",
      icon: Users,
      title: str(c, "parent_title", "I'm a prospective family"),
      body: str(
        c,
        "parent_body",
        "Admissions requirements, tours, and how to hear about the next application window.",
      ),
      label: str(c, "parent_cta_label", "See admissions"),
      target: str(c, "parent_cta_target", "/admissions"),
    },
    {
      index: "02",
      icon: MessageSquare,
      title: str(c, "school_title", "I'm a current family"),
      body: str(
        c,
        "school_body",
        "Questions about your student's day-to-day — the front office and division staff can help.",
      ),
      label: str(c, "school_cta_label", "Start an inquiry"),
      target: str(c, "school_cta_target", "#inquiry"),
    },
    {
      index: "03",
      icon: Briefcase,
      title: str(c, "other_title", "Careers or general"),
      body: str(
        c,
        "other_body",
        "Open roles, media requests, and anything else that doesn't fit the boxes above.",
      ),
      label: str(c, "other_cta_label", "See open roles"),
      target: str(c, "other_cta_target", "/careers"),
    },
  ];

  return (
    <Band
      theme={theme}
      label="Where to start"
      sheet="NB / CNT · 02"
      diagram="comet"
      diagramPosition="left"
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14"
      >
        <motion.div variants={fadeUp}>
          <p
            className={
              "font-mono text-[0.62rem] uppercase tracking-[0.3em] " +
              (light ? "text-navy-900/60" : "text-cyan")
            }
          >
            {str(c, "eyebrow", "Where to start")}
          </p>
          <h2
            className={
              "mt-4 max-w-[14ch] font-display text-[1.85rem] font-bold leading-[1.08] tracking-tight sm:text-[2.15rem] " +
              (light ? "text-navy-950" : "text-foreground")
            }
          >
            {str(c, "headline", "Not Sure Where to Start?")}
          </h2>
          <p
            className={
              "mt-4 max-w-sm text-[0.92rem] leading-relaxed " +
              (light ? "text-navy-900/70" : "text-gray-mid")
            }
          >
            {str(
              c,
              "subhead",
              "Pick the route that matches you — each one gets to the right person faster.",
            )}
          </p>
        </motion.div>

        <motion.div variants={stagger} className="grid gap-4 sm:grid-cols-3">
          {paths.map((p) => (
            <motion.a
              key={p.title}
              variants={fadeUp}
              href={p.target}
              className={
                "group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition duration-200 hover:-translate-y-0.5 " +
                (light
                  ? "border-navy-950/12 bg-white/80 hover:border-navy-950/35 hover:shadow-[0_18px_40px_-28px_rgba(9,16,40,0.55)]"
                  : "border-foreground/12 bg-foreground/[0.04] hover:border-cyan/40")
              }
            >
              <span
                aria-hidden
                className={
                  "absolute right-5 top-5 font-mono text-[0.6rem] tracking-[0.2em] " +
                  (light ? "text-navy-950/25" : "text-foreground/25")
                }
              >
                {p.index}
              </span>
              <span
                className={
                  "inline-flex size-9 items-center justify-center rounded-lg border " +
                  (light
                    ? "border-navy-950/12 bg-navy-950/[0.04]"
                    : "border-foreground/12 bg-foreground/[0.05]")
                }
              >
                <p.icon
                  className={"size-4 " + (light ? "text-navy-900" : "text-cyan")}
                  aria-hidden
                />
              </span>
              <p
                className={
                  "mt-5 font-display text-[1.15rem] font-bold " +
                  (light ? "text-navy-950" : "text-foreground")
                }
              >
                {p.title}
              </p>
              <p
                className={
                  "mt-2 text-[0.88rem] leading-relaxed " +
                  (light ? "text-navy-900/70" : "text-gray-mid")
                }
              >
                {p.body}
              </p>
              <span
                className={
                  "mt-6 inline-flex items-center gap-1.5 font-mono text-[0.62rem] uppercase tracking-[0.2em] transition " +
                  (light
                    ? "text-navy-900/70 group-hover:text-navy-950"
                    : "text-gray-mid group-hover:text-cyan")
                }
              >
                {p.label}
                <ArrowUpRight
                  className="size-3.5 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </motion.a>
          ))}
        </motion.div>
      </motion.div>
    </Band>
  );
}

/* ── 3 · Response expectation — dark ───────────────────────────────────── */

export function CtResponse() {
  const c = useSection("response", SLUG);
  const site = useSiteContent();
  const theme = themeOf(c, "dark");
  const note = setting(site.settings, "response_time_note", "Typical response time: 24 hours");

  return (
    <Band theme={theme} label="Response time">
      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        className={
          "text-center font-mono text-[0.72rem] uppercase tracking-[0.3em] " +
          (theme === "light" ? "text-navy-900/70" : "text-gray-mid")
        }
      >
        {note}
      </motion.p>
    </Band>
  );
}
