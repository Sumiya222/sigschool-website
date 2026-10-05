import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Building2,
  ChevronDown,
  Cpu,
  Mail,
  MapPin,
  Users,
  Clock,
} from "lucide-react";
import { Band, fadeUp, stagger } from "@/components/for-schools/Band";
import type { JobOpening } from "@/lib/careers.shared";
import { list, str, useSection, useSiteContent } from "@/lib/site-content";
import { BRAND } from "@/lib/brand";
import { ApplicationForm } from "./ApplicationForm";

const SLUG = "careers";

type Theme = "dark" | "light";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeOf(c: Record<string, any>, fallback: Theme): Theme {
  return c.theme === "light" ? "light" : c.theme === "dark" ? "dark" : fallback;
}

/* ── 1 · Hero — dark ───────────────────────────────────────────────────── */

type Fact = { label: string; value: string };

const HERO_FACTS: Fact[] = [
  { label: "Based at", value: BRAND.addressLine },
  { label: "Divisions", value: "Lower · Middle · Upper School" },
  { label: "Who we hire", value: "Teachers · Coordinators · Staff" },
  { label: "Engagement", value: "Full-time · Part-time · Seasonal" },
];

export function CrHero() {
  const c = useSection("hero", SLUG);
  const theme = themeOf(c, "dark");
  const facts = list<Fact>(c, "facts", HERO_FACTS);

  return (
    <Band theme={theme} label={`Careers at ${BRAND.name}`} hero>
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
            {str(c, "doc_ref", "Careers · NB / CAR")}
          </span>
          <span>{str(c, "doc_rev", "Rev. 2026.1")}</span>
        </motion.div>

        <div className="grid gap-10 pt-10 lg:min-h-[27rem] lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-16 lg:pt-14">
          <motion.div variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan"
            >
              {str(c, "eyebrow", "Careers")}
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mt-6 max-w-[20ch] font-display text-[2.5rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-[3.5rem] lg:text-[4.25rem]"
            >
              <span className="block">{str(c, "headline", "Teach the Things That")}</span>
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
              {str(
                c,
                "subhead",
                "We're looking for teachers, coordinators and staff who want to do their best work in front of real students.",
              )}
            </motion.p>
            <motion.a
              variants={fadeUp}
              href={str(c, "cta_target", "#open-roles")}
              className="mt-9 inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-navy-950 transition hover:brightness-110"
            >
              {str(c, "cta_label", "See open roles")}
              <ChevronDown className="size-3.5" aria-hidden />
            </motion.a>
          </motion.div>

          {facts.length > 0 && (
            <motion.dl
              variants={fadeUp}
              className="h-fit rounded-xl border border-foreground/12 bg-foreground/[0.03] p-5 backdrop-blur-sm lg:mt-2"
            >
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-gray-mid">
                At a glance
              </p>
              <div className="mt-4 space-y-3.5">
                {facts.map((f, i) => (
                  <div
                    key={`${f.label}-${i}`}
                    className="border-t border-foreground/10 pt-3.5 first:border-t-0 first:pt-0"
                  >
                    <dt className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-gray-mid">
                      {f.label}
                    </dt>
                    <dd className="mt-1 text-[0.95rem] font-medium text-foreground">{f.value}</dd>
                  </div>
                ))}
              </div>
            </motion.dl>
          )}
        </div>
      </motion.div>
    </Band>
  );
}

/* ── 2 · Why Signature School — light ──────────────────────────────────── */

const WHY_ICONS = [Users, Clock, Cpu, Building2];

export function CrWhy() {
  const c = useSection("why", SLUG);
  const site = useSiteContent();
  const theme = themeOf(c, "light");
  const light = theme === "light";

  const statKey = str(c, "block_1_stat_key", "students_engaged");
  const stat = site.stats.find((s) => s.key === statKey);
  const statText = stat ? `${stat.value}${stat.suffix ?? ""} ${stat.label}` : "";

  const blocks = [1, 2, 3, 4]
    .map((n, i) => ({
      title: str(c, `block_${n}_title`, ""),
      body: str(c, `block_${n}_body`, ""),
      icon: WHY_ICONS[i],
      stat: n === 1 ? statText : "",
      placeholder: n === 1 ? Boolean(stat?.is_placeholder) : false,
    }))
    .filter((b) => b.title || b.body);

  return (
    <Band theme={theme} label="What you would be joining" sheet="NB / CAR · 02" diagram="mesh">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
      >
        <motion.p
          variants={fadeUp}
          className={
            "font-mono text-[0.62rem] uppercase tracking-[0.3em] " +
            (light ? "text-navy-900/60" : "text-cyan")
          }
        >
          {str(c, "eyebrow", "What you'd be joining")}
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className={
            "mt-4 max-w-[18ch] font-display text-[1.85rem] font-bold leading-[1.08] tracking-tight sm:text-[2.4rem] " +
            (light ? "text-navy-950" : "text-foreground")
          }
        >
          {str(c, "headline", "What You'd Be Joining.")}
        </motion.h2>
        {str(c, "subhead", "") ? (
          <motion.p
            variants={fadeUp}
            className={
              "mt-4 max-w-xl text-[0.95rem] leading-relaxed " +
              (light ? "text-navy-900/70" : "text-gray-mid")
            }
          >
            {str(c, "subhead", "")}
          </motion.p>
        ) : null}

        <motion.div variants={stagger} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {blocks.map((b, i) => (
            <motion.div
              key={b.title || i}
              variants={fadeUp}
              className={
                "relative flex flex-col rounded-2xl border p-6 " +
                (light
                  ? "border-navy-950/12 bg-white/75"
                  : "border-foreground/12 bg-foreground/[0.04]")
              }
            >
              <span
                aria-hidden
                className={
                  "absolute right-5 top-5 font-mono text-[0.6rem] tracking-[0.2em] " +
                  (light ? "text-navy-950/25" : "text-foreground/25")
                }
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  "inline-flex size-9 items-center justify-center rounded-lg border " +
                  (light
                    ? "border-navy-950/12 bg-navy-950/[0.04]"
                    : "border-foreground/12 bg-foreground/[0.05]")
                }
              >
                <b.icon
                  className={"size-4 " + (light ? "text-navy-900" : "text-cyan")}
                  aria-hidden
                />
              </span>
              <p
                className={
                  "mt-5 font-display text-[1.1rem] font-bold " +
                  (light ? "text-navy-950" : "text-foreground")
                }
              >
                {b.title}
              </p>
              {b.stat ? (
                <p
                  className={
                    "mt-2 font-mono text-[0.68rem] uppercase tracking-[0.18em] " +
                    (light ? "text-navy-900/70" : "text-cyan")
                  }
                >
                  {b.stat}
                  {b.placeholder ? (
                    <span className="ml-2 rounded-sm bg-gold/25 px-1.5 py-0.5 text-[0.58rem] text-navy-950">
                      Placeholder
                    </span>
                  ) : null}
                </p>
              ) : null}
              <p
                className={
                  "mt-2 text-[0.88rem] leading-relaxed " +
                  (light ? "text-navy-900/70" : "text-gray-mid")
                }
              >
                {b.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </Band>
  );
}

/* ── 3 · Open roles — dark ─────────────────────────────────────────────── */

function RoleList({ text }: { text: string }) {
  const items = text
    .split("\n")
    .map((l) => l.replace(/^[-•\s]+/, "").trim())
    .filter(Boolean);
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 space-y-2">
      {items.map((line) => (
        <li key={line} className="flex gap-2.5 text-[0.9rem] leading-relaxed text-gray-mid">
          <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-cyan" />
          {line}
        </li>
      ))}
    </ul>
  );
}

export function CrRoles({ roles }: { roles: JobOpening[] }) {
  const c = useSection("roles", SLUG);
  const theme = themeOf(c, "dark");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Band theme={theme} label="Open roles" id="open-roles">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
      >
        <motion.p
          variants={fadeUp}
          className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-cyan"
        >
          {str(c, "eyebrow", "Open roles")}
        </motion.p>
        <motion.h2
          variants={fadeUp}
          className="mt-4 font-display text-[1.85rem] font-bold leading-[1.08] tracking-tight text-foreground sm:text-[2.4rem]"
        >
          {str(c, "headline", "Open Roles.")}
        </motion.h2>
        {str(c, "subhead", "") ? (
          <motion.p
            variants={fadeUp}
            className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-gray-mid"
          >
            {str(c, "subhead", "")}
          </motion.p>
        ) : null}

        {roles.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="mt-10 rounded-2xl border border-dashed border-foreground/18 bg-foreground/[0.03] p-8 sm:p-10"
          >
            <p className="font-display text-[1.25rem] font-bold text-foreground">
              {str(c, "empty_title", "No open roles right now")}
            </p>
            <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-gray-mid">
              {str(
                c,
                "empty_body",
                "We're always interested in hearing from good educators. Send a general application and we'll keep you on file for the next opening.",
              )}
            </p>
            <a
              href="#apply"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/85 transition hover:border-cyan/50 hover:text-cyan"
            >
              Send a general application
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </motion.div>
        ) : (
          <motion.ul variants={stagger} className="mt-10 space-y-3">
            {roles.map((r) => {
              const expanded = openId === r.id;
              return (
                <motion.li
                  key={r.id}
                  variants={fadeUp}
                  className="overflow-hidden rounded-2xl border border-foreground/12 bg-foreground/[0.035] transition hover:border-foreground/20"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(expanded ? null : r.id)}
                    aria-expanded={expanded}
                    className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left sm:p-6"
                  >
                    <span className="min-w-0">
                      <span className="block font-display text-[1.2rem] font-bold text-foreground">
                        {r.title}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-gray-mid">
                        {r.department ? <span>{r.department}</span> : null}
                        {r.location ? (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3" aria-hidden />
                            {r.location}
                          </span>
                        ) : null}
                        <span className="rounded-full border border-cyan/30 px-2 py-0.5 text-cyan">
                          {r.employment_type}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-navy-950">
                        {expanded ? "Close" : "View role"}
                      </span>
                      <ChevronDown
                        className={
                          "size-4 text-gray-mid transition " + (expanded ? "rotate-180" : "")
                        }
                        aria-hidden
                      />
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expanded ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-foreground/10 p-5 sm:p-6">
                          {r.description ? (
                            <p className="max-w-3xl text-[0.95rem] leading-relaxed text-gray-mid">
                              {r.description}
                            </p>
                          ) : null}
                          <div className="mt-6 grid gap-8 lg:grid-cols-2">
                            {r.responsibilities ? (
                              <div>
                                <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-cyan">
                                  What you'd do
                                </p>
                                <RoleList text={r.responsibilities} />
                              </div>
                            ) : null}
                            {r.requirements ? (
                              <div>
                                <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-cyan">
                                  What we need
                                </p>
                                <RoleList text={r.requirements} />
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-7 flex flex-wrap items-center gap-4">
                            <a
                              href={`#apply-${r.id}`}
                              onClick={() => {
                                window.dispatchEvent(
                                  new CustomEvent("careers:apply", { detail: { id: r.id } }),
                                );
                              }}
                              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-navy-950 transition hover:brightness-110"
                            >
                              Apply for this role
                              <ArrowUpRight className="size-3.5" aria-hidden />
                            </a>
                            {r.closes_at ? (
                              <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-gray-mid">
                                Closes{" "}
                                {new Date(r.closes_at).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </motion.div>
    </Band>
  );
}

/* ── 4 · Application form — light ──────────────────────────────────────── */

export function CrApply({ roles }: { roles: JobOpening[] }) {
  const c = useSection("apply", SLUG);
  const theme = themeOf(c, "light");
  const light = theme === "light";

  return (
    <Band
      theme={theme}
      label="Application form"
      id="apply"
      sheet="NB / CAR · 04"
      diagram="rocket"
      diagramPosition="left"
    >
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16"
      >
        <motion.div variants={fadeUp}>
          <p
            className={
              "font-mono text-[0.62rem] uppercase tracking-[0.3em] " +
              (light ? "text-navy-900/60" : "text-cyan")
            }
          >
            {str(c, "eyebrow", "Application")}
          </p>
          <h2
            className={
              "mt-4 font-display text-[1.85rem] font-bold leading-[1.08] tracking-tight sm:text-[2.4rem] " +
              (light ? "text-navy-950" : "text-foreground")
            }
          >
            {str(c, "headline", "Apply.")}
          </h2>
          <p
            className={
              "mt-4 max-w-sm text-[0.92rem] leading-relaxed " +
              (light ? "text-navy-900/70" : "text-gray-mid")
            }
          >
            {str(c, "subhead", "One form for every role. Attach a CV and we'll come back to you.")}
          </p>
        </motion.div>

        <ApplicationForm roles={roles} content={c} light={light} />
      </motion.div>
    </Band>
  );
}

/* ── 5 · Closing — dark ────────────────────────────────────────────────── */

export function CrClosing() {
  const c = useSection("closing", SLUG);
  const theme = themeOf(c, "dark");
  // HR-specific inbox for speculative applications — deliberately not the
  // site-wide contact_email setting, since job applications should go to HR.
  const email = str(c, "hr_email", BRAND.careersEmail);

  return (
    <Band theme={theme} label="Speculative applications">
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="mx-auto max-w-2xl text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="font-display text-[1.6rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2rem]"
        >
          {str(c, "headline", "Nothing Listed That Fits?")}
        </motion.h2>
        <motion.p variants={fadeUp} className="mt-4 text-[0.98rem] leading-relaxed text-gray-mid">
          {str(
            c,
            "body",
            "If you'd be a good fit for our classrooms and can't find the role, write to us anyway. Speculative applications are read.",
          )}
        </motion.p>
        <motion.a
          variants={fadeUp}
          href={`mailto:${email}`}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-foreground/18 px-6 py-3 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/85 transition hover:border-cyan/50 hover:text-cyan"
        >
          <Mail className="size-3.5" aria-hidden />
          {str(c, "cta_label", "Email us directly")} · {email}
        </motion.a>
      </motion.div>
    </Band>
  );
}
