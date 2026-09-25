import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Check, MessageCircle } from "lucide-react";
import { GoldButton, GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { Band, BandHeader, fadeUp, stagger } from "@/components/for-schools/Band";
import {
  list,
  mediaById,
  mediaUrl,
  setting,
  str,
  useSection,
  useSiteContent,
} from "@/lib/site-content";
import { useCampRegistration } from "@/components/camp/CampRegistrationProvider";

const SLUG = "programs";

type Theme = "dark" | "light";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeOf(c: Record<string, any>, fallback: Theme): Theme {
  return c.theme === "light" ? "light" : c.theme === "dark" ? "dark" : fallback;
}

const DOMAIN_ACCENT: Record<string, string> = {
  robotics: "#67e8f9",
  ai: "#818cf8",
  space: "#e879a8",
};

/* ── 1 · Hero — dark masthead ─────────────────────────────────────────── */

type Fact = { label: string; value: string };

export function PrHero() {
  const c = useSection("hero", SLUG);
  const theme = themeOf(c, "dark");
  const facts = list<Fact>(c, "facts", []);
  const headline = str(c, "headline", "Four Programs.");
  const accent = str(c, "headline_gradient", "One Launchpad.");

  return (
    <Band theme={theme} label="Programs introduction" hero>
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
            {str(c, "doc_ref", "Program Catalogue · AB / PRG")}
          </span>
          <span>{str(c, "doc_rev", "Rev. 2026.1")}</span>
        </motion.div>

        <motion.div
          variants={stagger}
          className="grid gap-12 pt-10 lg:min-h-[27rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 lg:pt-14"
        >
          <motion.div variants={stagger}>
            <motion.p
              variants={fadeUp}
              className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-cyan"
            >
              {str(c, "eyebrow", "Programs")}
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="mt-6 max-w-[22ch] font-display text-[2.5rem] font-bold leading-[1.02] tracking-tight text-foreground sm:text-[3.5rem] lg:text-[4.25rem]"
            >
              <span className="block">{headline}</span>
              {accent ? (
                <span className="block bg-gradient-to-r from-gold-bright to-cyan-bright bg-clip-text text-transparent">
                  {accent}
                </span>
              ) : null}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-7 max-w-2xl text-[1.05rem] leading-relaxed text-gray-mid"
            >
              {str(c, "subhead", "")}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-4">
              <a href={str(c, "cta_target", "/contact")} className={goldButtonClassName}>
                {GoldButtonSheen}
                <span className="relative inline-flex items-center gap-2">
                  {str(c, "cta_label", "Inquire")}
                </span>
              </a>
              <a
                href={str(c, "secondary_cta_target", "/schools")}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                {str(c, "secondary_cta_label", "Schools: see the delivery spec")}
                <ArrowDownRight className="size-3.5" aria-hidden />
              </a>
            </motion.div>
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
        </motion.div>
      </motion.div>
    </Band>
  );
}

/* ── 2 · Camp registration banner — CMS toggled ───────────────────────── */

export function PrCampBanner() {
  const camp = useSiteContent().campWindow;
  const { open: openRegistration } = useCampRegistration();
  if (!camp) return null;

  if (!camp.is_open) {
    if (!camp.show_closed_strip) return null;
    return (
      <section aria-label="Camp registration status" className="relative w-full pb-10">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
          <a
            href={camp.closed_target || "/contact"}
            className="flex flex-wrap items-center justify-center gap-3 rounded-lg border border-foreground/12 bg-foreground/[0.03] px-5 py-3 text-center font-mono text-[0.68rem] uppercase tracking-[0.2em] text-gray-mid transition-colors hover:border-cyan/40 hover:text-cyan"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-gold/70" />
            {camp.closed_message}
          </a>
        </div>
      </section>
    );
  }

  const details = [
    { label: "Dates", value: camp.dates_label },
    { label: "Venue", value: camp.venue },
    { label: "Age tracks", value: camp.age_tracks },
  ].filter((d) => d.value);

  return (
    <section aria-label="Camp registration" className="relative w-full pb-12 pt-2">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className="overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/[0.12] to-cyan/[0.06] p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-gold">
                <span
                  aria-hidden
                  className="led size-1.5 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]"
                />
                {camp.is_full ? "Waitlist open" : "Registration open"}
              </p>
              <h2 className="mt-3 font-display text-[1.6rem] font-bold leading-tight text-foreground sm:text-[2rem]">
                {camp.camp_name}
              </h2>
              {details.length > 0 && (
                <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3">
                  {details.map((d) => (
                    <div key={d.label}>
                      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-gray-mid">
                        {d.label}
                      </dt>
                      <dd className="mt-1 text-[0.95rem] font-medium text-foreground">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {camp.note ? (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-mid">{camp.note}</p>
              ) : null}
            </div>
            <div className="shrink-0">
              {camp.registration_mode === "built_in" ? (
                <GoldButton type="button" onClick={openRegistration}>
                  {camp.is_full ? "Join the waitlist" : camp.register_label || "Register Now"}
                </GoldButton>
              ) : camp.registration_mode === "external" && camp.register_url ? (
                <a
                  href={camp.register_url}
                  target="_blank"
                  rel="noreferrer"
                  className={goldButtonClassName}
                >
                  {GoldButtonSheen}
                  <span className="relative inline-flex items-center gap-2">
                    {camp.register_label || "Register Now"}
                  </span>
                </a>
              ) : (
                <a href="/contact" className={goldButtonClassName}>
                  {GoldButtonSheen}
                  <span className="relative inline-flex items-center gap-2">Details soon</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 3 · The four programs — light ────────────────────────────────────── */

export function PrFourPrograms() {
  const c = useSection("four_programs", SLUG);
  const theme = themeOf(c, "light");
  const { programs } = useSiteContent();

  const publicLabel = str(c, "public_label", "Open to the public");
  const schoolLabel = str(c, "school_label", "For schools");
  const publicCtaLabel = str(c, "public_cta_label", "Inquire");
  const publicCtaTarget = str(c, "public_cta_target", "/contact");
  const schoolCtaLabel = str(c, "school_cta_label", "Partner With Us");
  const schoolCtaTarget = str(c, "school_cta_target", "/schools");

  return (
    <Band
      theme={theme}
      label="The four programs"
      sheet="Sheet 01 · Programs"
      diagram="robot"
      diagramPosition="right"
      diagramSecondary="drone"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "The Four Programs")}
        headline={str(c, "headline", "Choose Your Entry Point.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.12 }}
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {programs.map((p) => {
          const isSchool = /school/i.test(p.badge_label) || /school/i.test(p.name);
          return (
            <motion.article
              key={p.id}
              variants={fadeUp}
              className={
                "flex flex-col rounded-xl border p-6 sm:p-7 " +
                (isSchool
                  ? "border-navy-950/25 bg-navy-950 text-white sm:col-span-2 lg:col-span-3"
                  : "border-navy-950/12 bg-white/70")
              }
            >
              <div className="flex items-center justify-between gap-4">
                <span
                  className={
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.22em] " +
                    (isSchool
                      ? "border-white/25 bg-white/10 text-cyan-bright"
                      : "border-navy-950/15 bg-navy-950/[0.04] text-navy-900")
                  }
                >
                  {isSchool ? schoolLabel : publicLabel}
                </span>
              </div>

              <h3
                className={
                  "mt-5 font-display text-[1.4rem] font-bold leading-tight " +
                  (isSchool ? "text-white" : "text-navy-950")
                }
              >
                {p.name}
              </h3>
              <p
                className={
                  "mt-3 max-w-2xl text-[0.97rem] leading-relaxed " +
                  (isSchool ? "text-white/70" : "text-navy-900/70")
                }
              >
                {p.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {(p.tags ?? []).map((t) => (
                  <span
                    key={t}
                    className={
                      "rounded-full border px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] " +
                      (isSchool
                        ? "border-white/18 text-white/65"
                        : "border-navy-950/12 text-navy-900/60")
                    }
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div className="mt-7 pt-1">
                <a
                  href={isSchool ? schoolCtaTarget : publicCtaTarget}
                  className={
                    "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] transition-colors " +
                    (isSchool
                      ? "border-white/25 text-white hover:border-cyan/60 hover:text-cyan-bright"
                      : "border-navy-950/20 text-navy-950 hover:border-gold hover:text-gold")
                  }
                >
                  {isSchool ? schoolCtaLabel : publicCtaLabel}
                  <ArrowUpRight className="size-3.5" aria-hidden />
                </a>
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      {c.note ? (
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-navy-900/65">{String(c.note)}</p>
      ) : null}
    </Band>
  );
}

/* ── 4 · Age tracks — dark ────────────────────────────────────────────── */

type Track = { title?: string; grades?: string; desc?: string; bullets?: string[] };

const TRACK_ACCENTS = ["#67e8f9", "#818cf8", "#e879a8"];

export function PrAgeTracks() {
  const c = useSection("tracks", SLUG);
  const theme = themeOf(c, "dark");
  const items = list<Track>(c, "items", []);

  return (
    <Band theme={theme} label="Age tracks">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Age Tracks")}
        headline={str(c, "headline", "Three Tracks. Built by Age, Not Grade.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {items.map((t, i) => {
          const accent = TRACK_ACCENTS[i % TRACK_ACCENTS.length];
          return (
            <motion.article
              key={`${t.title}-${i}`}
              variants={fadeUp}
              className="flex flex-col rounded-xl border border-foreground/12 bg-foreground/[0.03] p-6 backdrop-blur-sm"
              style={{ borderTopColor: accent, borderTopWidth: 2 }}
            >
              <p
                className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em]"
                style={{ color: accent }}
              >
                {t.grades}
              </p>
              <h3 className="mt-3 font-display text-[1.3rem] font-bold text-foreground">
                {t.title}
              </h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-gray-mid">{t.desc}</p>
              <ul className="mt-5 space-y-2">
                {(t.bullets ?? []).map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <Check
                      className="mt-0.5 size-3.5 shrink-0"
                      style={{ color: accent }}
                      aria-hidden
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.article>
          );
        })}
      </motion.div>
    </Band>
  );
}

/* ── 5 · What a session looks like — light ────────────────────────────── */

type Phase = { title?: string; copy?: string };
type Tool = { title?: string; copy?: string };

export function PrSessionShape() {
  const c = useSection("session_shape", SLUG);
  const theme = themeOf(c, "light");
  const phases = list<Phase>(c, "phases", []);
  const tools = list<Tool>(c, "tools", []);

  return (
    <Band
      theme={theme}
      label="What a session looks like"
      sheet="Sheet 02 · Session"
      diagram="circuit"
      diagramPosition="left"
      diagramSecondary="rocket"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Inside a Session")}
        headline={str(c, "headline", "Concept. Exploration. Execution.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />

      <motion.ol
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {phases.map((p, i) => (
          <motion.li
            key={`${p.title}-${i}`}
            variants={fadeUp}
            className="rounded-xl border border-navy-950/12 bg-white/70 p-6"
          >
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-navy-900/45">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 font-display text-[1.2rem] font-bold text-navy-950">{p.title}</h3>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-navy-900/70">{p.copy}</p>
          </motion.li>
        ))}
      </motion.ol>

      {tools.length > 0 && (
        <div className="mt-14">
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-navy-900/55">
            {str(c, "tools_label", "Tools students actually use")}
          </p>
          <motion.dl
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {tools.map((t, i) => (
              <motion.div
                key={`${t.title}-${i}`}
                variants={fadeUp}
                className="border-t border-navy-950/12 pt-4"
              >
                <dt className="font-display text-[1rem] font-semibold text-navy-950">{t.title}</dt>
                <dd className="mt-1.5 text-[0.9rem] leading-relaxed text-navy-900/70">{t.copy}</dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>
      )}

      {c.note ? (
        <p className="mt-10 max-w-2xl border-l-2 border-gold/70 pl-4 text-[0.98rem] leading-relaxed text-navy-950">
          {String(c.note)}
        </p>
      ) : null}
    </Band>
  );
}

/* ── 6 · What students build — dark ───────────────────────────────────── */

export function PrStudentBuilds() {
  const c = useSection("student_builds", SLUG);
  const theme = themeOf(c, "dark");
  const content = useSiteContent();
  const projects = content.projects;
  const unconfirmed = str(c, "unconfirmed_note", "Description pending confirmation");

  return (
    <Band theme={theme} label="What students build">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "What Students Build")}
        headline={str(c, "headline", "They Take It Home.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {projects.map((p) => {
          const img = mediaUrl(mediaById(content, p.media_id));
          const accent = DOMAIN_ACCENT[p.domain] ?? "#67e8f9";
          return (
            <motion.article
              key={p.id}
              variants={fadeUp}
              className="overflow-hidden rounded-xl border border-foreground/12 bg-foreground/[0.03]"
            >
              {img ? (
                <img
                  src={img}
                  alt={mediaById(content, p.media_id)?.alt_text ?? p.title}
                  loading="lazy"
                  className="h-36 w-full object-cover"
                />
              ) : null}
              <div className="p-5">
                <p
                  className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: accent }}
                >
                  {p.age_range}
                </p>
                <h3 className="mt-2 font-display text-[1.05rem] font-semibold text-foreground">
                  {p.title}
                </h3>
                {p.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-gray-mid">{p.description}</p>
                ) : null}
                {!p.description_confirmed ? (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-gold">
                    {unconfirmed}
                  </p>
                ) : null}
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      <div className="mt-10">
        <a
          href={str(c, "cta_target", "/students")}
          className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:border-cyan/50 hover:text-cyan"
        >
          {str(c, "cta_label", "See the full gallery")}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </Band>
  );
}

/* ── 7 · Curriculum scale — light ─────────────────────────────────────── */

type Domain = { title?: string; copy?: string };

export function PrCurriculumScale() {
  const c = useSection("curriculum_scale", SLUG);
  const theme = themeOf(c, "light");
  const domains = list<Domain>(c, "domains", []);
  const facts = list<Fact>(c, "facts", []);

  return (
    <Band
      theme={theme}
      label="Curriculum scale"
      sheet="Sheet 03 · Curriculum"
      diagram="mesh"
      diagramPosition="right"
      diagramSecondary="comet"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Curriculum Scale")}
        headline={str(c, "headline", "36 Modules a Year. None Repeated.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid gap-6 md:grid-cols-3"
      >
        {domains.map((d, i) => (
          <motion.div
            key={`${d.title}-${i}`}
            variants={fadeUp}
            className="rounded-xl border border-navy-950/12 bg-white/70 p-6"
          >
            <h3 className="font-display text-[1.15rem] font-bold text-navy-950">{d.title}</h3>
            <p className="mt-3 text-[0.94rem] leading-relaxed text-navy-900/70">{d.copy}</p>
          </motion.div>
        ))}
      </motion.div>

      {facts.length > 0 && (
        <dl className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f, i) => (
            <div key={`${f.label}-${i}`} className="border-t border-navy-950/15 pt-4">
              <dt className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-navy-900/55">
                {f.label}
              </dt>
              <dd className="mt-1.5 font-display text-[1.6rem] font-bold text-navy-950">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {c.note ? (
        <p className="mt-10 max-w-2xl text-[0.98rem] leading-relaxed text-navy-900/75">
          {String(c.note)}
        </p>
      ) : null}
      {c.closing_line ? (
        <p className="mt-4 max-w-2xl border-l-2 border-gold/70 pl-4 text-[0.98rem] leading-relaxed text-navy-950">
          {String(c.closing_line)}
        </p>
      ) : null}
    </Band>
  );
}

/* ── 8 · Closing CTA — dark ───────────────────────────────────────────── */

export function PrClosingCta() {
  const c = useSection("closing_cta", SLUG);
  const theme = themeOf(c, "dark");
  const { settings } = useSiteContent();
  const whatsapp = setting(settings, "whatsapp_url", "");

  return (
    <Band theme={theme} label="Closing call to action">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Get Started")}
        headline={str(c, "headline", "Two Ways In.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div
          variants={fadeUp}
          className="flex flex-col rounded-xl border border-gold/25 bg-gold/12 backdrop-blur-md p-7"
        >
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-gold">
            {str(c, "parent_title", "For parents")}
          </p>
          <p className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-offwhite/80">
            {str(c, "parent_copy", "")}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href={str(c, "primary_cta_target", "/contact")} className={goldButtonClassName}>
              {GoldButtonSheen}
              <span className="relative inline-flex items-center gap-2">
                {str(c, "primary_cta_label", "Inquire")}
              </span>
            </a>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold/10"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                {str(c, "whatsapp_label", "Message us on WhatsApp")}
              </a>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="flex flex-col rounded-xl border border-cyan/25 bg-cyan/12 backdrop-blur-md p-7"
        >
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-cyan">
            {str(c, "school_title", "For schools")}
          </p>
          <p className="mt-4 flex-1 text-[0.98rem] leading-relaxed text-offwhite/80">
            {str(c, "school_copy", "")}
          </p>
          <div className="mt-7">
            <a
              href={str(c, "secondary_cta_target", "/schools")}
              className="inline-flex items-center gap-2 rounded-full border border-cyan/40 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-cyan transition-colors hover:bg-cyan/10"
            >
              {str(c, "secondary_cta_label", "Partner With Us")}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </Band>
  );
}
