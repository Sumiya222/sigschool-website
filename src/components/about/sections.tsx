import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react";
import { GoldButtonSheen, goldButtonClassName } from "@/components/GoldButton";
import { Band, BandHeader, fadeUp, stagger } from "@/components/for-schools/Band";
import type { TeamMember } from "@/lib/site-content";
import {
  focalPosition,
  initials,
  list,
  mediaById,
  mediaUrl,
  str,
  useSection,
  useSiteContent,
} from "@/lib/site-content";

const SLUG = "about";

type Theme = "dark" | "light";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function themeOf(c: Record<string, any>, fallback: Theme): Theme {
  return c.theme === "light" ? "light" : c.theme === "dark" ? "dark" : fallback;
}

/* ── 1 · Hero — dark masthead (matches /programs and /schools) ────── */

type Fact = { label: string; value: string };

const HERO_FACTS: Fact[] = [
  { label: "Founded", value: "Islamabad, Pakistan" },
  { label: "Model", value: "In-school weekly subject" },
  { label: "Domains", value: "Robotics · AI · Space" },
  { label: "Reach", value: "Pakistan & MENA" },
];

export function AbHero() {
  const c = useSection("hero", SLUG);
  const theme = themeOf(c, "dark");
  const facts = list<Fact>(c, "facts", HERO_FACTS);
  const headline = str(c, "headline", "A System-Level");
  const accent = str(c, "headline_gradient", "Education Provider.");

  return (
    <Band theme={theme} label="About AstroBot Academy" hero>
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
            {str(c, "doc_ref", "Institutional Profile · AB / ABT")}
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
              {str(c, "eyebrow", "About")}
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
              <a href={str(c, "cta_target", "/schools")} className={goldButtonClassName}>
                {GoldButtonSheen}
                <span className="relative inline-flex items-center gap-2">
                  {str(c, "cta_label", "Partner With Us")}
                </span>
              </a>
              <a
                href={str(c, "secondary_cta_target", "/programs")}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                {str(c, "secondary_cta_label", "See the programs")}
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

/* ── 2 · Positioning — light specification sheet ──────────────────────── */

export function AbPositioning() {
  const c = useSection("positioning", SLUG);
  const theme = themeOf(c, "light");
  const { stats } = useSiteContent();
  const shown = stats.slice(0, 4);
  const anyPlaceholder = shown.some((s) => s.is_placeholder);

  return (
    <Band theme={theme} label="Who we are" sheet="Sheet 01 · Positioning" diagram="mesh">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Positioning")}
        headline={str(c, "headline", "Who We Are.")}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"
      >
        <motion.div variants={fadeUp}>
          <p className="max-w-2xl text-[1.02rem] leading-relaxed text-navy-900/80">
            {str(c, "body", "")}
          </p>
          {c.note ? (
            <p className="mt-6 max-w-2xl border-l-2 border-navy-950/20 pl-4 text-[0.94rem] leading-relaxed text-navy-900/65">
              {String(c.note)}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-navy-950/15 bg-white/55 p-6 backdrop-blur-[1px]"
        >
          <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-navy-900/60">
            {str(c, "stats_label", "Key figures")}
          </p>
          <dl className="mt-5 space-y-4">
            {shown.map((s) => (
              <div
                key={s.key}
                className="flex items-baseline justify-between gap-4 border-b border-navy-950/10 pb-3 last:border-0 last:pb-0"
              >
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-navy-900/60">
                  {s.label}
                </dt>
                <dd className="font-display text-lg font-bold text-navy-950">
                  {s.value}
                  {s.suffix ?? ""}
                  {s.is_placeholder ? (
                    <span className="ml-2 rounded-full border border-gold/60 bg-gold/10 px-2 py-0.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-navy-900/70">
                      Provisional
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
          {anyPlaceholder ? (
            <p className="mt-4 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-navy-900/50">
              Figures marked provisional are pending final confirmation.
            </p>
          ) : null}
        </motion.div>
      </motion.div>
    </Band>
  );
}

/* ── 3 · Vision & Mission — dark ──────────────────────────────────────── */

export function AbVisionMission() {
  const c = useSection("vision_mission", SLUG);
  const theme = themeOf(c, "dark");

  const cards = [
    {
      label: str(c, "vision_label", "Vision"),
      copy: str(c, "vision", ""),
      accent: "cyan",
    },
    {
      label: str(c, "mission_label", "Mission"),
      copy: str(c, "mission", ""),
      accent: "gold",
    },
  ];

  return (
    <Band theme={theme} label="Vision and mission">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Vision & Mission")}
        headline={str(c, "headline", "What We're Building Toward.")}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid gap-6 lg:grid-cols-2"
      >
        {cards.map((card) => (
          <motion.div
            key={card.label}
            variants={fadeUp}
            className={
              "rounded-xl border p-8 backdrop-blur-md " +
              (card.accent === "cyan" ? "border-cyan/25 bg-cyan/12" : "border-gold/25 bg-gold/12")
            }
          >
            <p
              className={
                "font-mono text-[0.62rem] font-semibold uppercase tracking-[0.24em] " +
                (card.accent === "cyan" ? "text-cyan" : "text-gold")
              }
            >
              {card.label}
            </p>
            <p className="mt-5 text-[1.02rem] leading-relaxed text-offwhite/80">{card.copy}</p>
          </motion.div>
        ))}
      </motion.div>
    </Band>
  );
}

/* ── 4 · Ecosystem & affiliations — light ─────────────────────────────── */

export function AbEcosystem() {
  const c = useSection("ecosystem", SLUG);
  const theme = themeOf(c, "light");
  const { affiliations } = useSiteContent();

  const national = affiliations.filter((a) => a.scope === "national");
  const international = affiliations.filter((a) => a.scope === "international");

  const columns = [
    { label: str(c, "national_label", "National"), rows: national },
    { label: str(c, "international_label", "International"), rows: international },
  ];

  return (
    <Band
      theme={theme}
      label="Ecosystem and affiliations"
      sheet="Sheet 02 · Ecosystem"
      diagram="circuit"
      diagramSecondary="comet"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Ecosystem & Affiliations")}
        headline={str(c, "headline", "Where We Sit.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className="mt-12 grid gap-8 md:grid-cols-2"
      >
        {columns.map((col) => (
          <motion.div key={col.label} variants={fadeUp}>
            <p
              className={
                "border-b pb-2 font-mono text-[0.62rem] font-semibold uppercase tracking-[0.26em] " +
                (theme === "dark"
                  ? "border-foreground/20 text-gray-mid"
                  : "border-navy-950/20 text-navy-900/70")
              }
            >
              {col.label}
            </p>
            <ul className="mt-4 space-y-2.5">
              {col.rows.map((a) => (
                <li key={a.id} className="flex items-start gap-3">
                  <Check className="mt-1 size-3.5 shrink-0 text-gold" aria-hidden />
                  <span
                    className={
                      "text-[0.95rem] leading-relaxed " +
                      (theme === "dark" ? "text-foreground/85" : "text-navy-900/85")
                    }
                  >
                    {a.name}
                    {a.note ? (
                      <span
                        className={
                          "block text-[0.82rem] " +
                          (theme === "dark" ? "text-gray-mid" : "text-navy-900/55")
                        }
                      >
                        {a.note}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
      {c.note ? (
        <p
          className={
            "mt-10 font-mono text-[0.6rem] uppercase tracking-[0.2em] " +
            (theme === "dark" ? "text-gray-mid/70" : "text-navy-900/50")
          }
        >
          {String(c.note)}
        </p>
      ) : null}
    </Band>
  );
}

/* ── 5 · How we teach — light ─────────────────────────────────────────── */

type Method = { label: string; copy: string };
type Phase = { code: string; title: string; copy: string };

export function AbHowWeTeach() {
  const c = useSection("how_we_teach", SLUG);
  const theme = themeOf(c, "light");
  const methods = list<Method>(c, "methods", []);
  const phases = list<Phase>(c, "phases", []);

  return (
    <Band
      theme={theme}
      label="How we teach"
      sheet="Sheet 03 · Method"
      diagram="gears"
      diagramSecondary="arm"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "How We Teach")}
        headline={str(c, "headline", "Eight Methods. One Session Structure.")}
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.12 }}
        className="mt-12"
      >
        <motion.p
          variants={fadeUp}
          className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-navy-900/60"
        >
          {str(c, "methods_label", "Learning methodologies")}
        </motion.p>
        <div className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {methods.map((m) => (
            <motion.div
              key={m.label}
              variants={fadeUp}
              className="border-t border-navy-950/20 pt-3"
            >
              <p className="font-display text-[0.95rem] font-semibold text-navy-950">{m.label}</p>
              <p className="mt-1.5 text-[0.86rem] leading-relaxed text-navy-900/65">{m.copy}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          variants={fadeUp}
          className="mt-14 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-navy-900/60"
        >
          {str(c, "phases_label", "Session structure")}
        </motion.p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {phases.map((p) => (
            <motion.div
              key={p.code}
              variants={fadeUp}
              className="rounded-lg border border-navy-950/15 bg-white/55 p-6"
            >
              <span className="font-mono text-[0.62rem] font-semibold tracking-[0.2em] text-gold">
                {p.code}
              </span>
              <p className="mt-3 font-display text-lg font-bold text-navy-950">{p.title}</p>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-navy-900/70">{p.copy}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </Band>
  );
}

/* ── 6 · Leadership & team — dark ─────────────────────────────────────── */

function Monogram({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={
        "grid size-full place-items-center bg-[radial-gradient(circle_at_30%_25%,rgba(56,189,248,0.22),rgba(56,189,248,0.04))] font-display font-bold uppercase tracking-[0.06em] text-cyan/80 " +
        className
      }
    >
      {initials(name)}
    </span>
  );
}

function Portrait({
  person,
  className,
  monogramClass,
}: {
  person: TeamMember;
  className: string;
  monogramClass?: string;
}) {
  const content = useSiteContent();
  const row = mediaById(content, person.media_id);
  const src = mediaUrl(row);
  return (
    <div className={"shrink-0 overflow-hidden border border-cyan/25 bg-cyan/[0.06] " + className}>
      {src ? (
        <img
          src={src}
          alt={row?.alt_text || person.name}
          loading="lazy"
          style={{ objectPosition: focalPosition(content, person.media_id) }}
          className="size-full object-cover"
        />
      ) : (
        <Monogram name={person.name} className={monogramClass} />
      )}
    </div>
  );
}

function BioMarker({ note }: { note: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/[0.08] px-3 py-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-gold">
      {note}
    </span>
  );
}

export function AbLeadership() {
  const c = useSection("leadership", SLUG);
  const theme = themeOf(c, "dark");
  const content = useSiteContent();
  const note = str(c, "unconfirmed_note", "Biography pending confirmation");

  // One section, one people list: leadership sits on the top row, everyone
  // else flows on from there in the same card treatment.
  const people = [...content.leadership].sort((a, b) => {
    const rank = (p: TeamMember) => (p.tier === "team" ? 1 : 0);
    return rank(a) - rank(b) || a.order - b.order;
  });

  if (people.length === 0) return null;

  return (
    <Band theme={theme} label="Our people">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "People")}
        headline={str(c, "headline", "The People Behind AstroBot.")}
        subhead={c.subhead ? String(c.subhead) : undefined}
      />

      <motion.ul
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.05 }}
        className="-mx-4 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-5 [scrollbar-width:thin]"
      >
        {people.map((p) => (
          <PersonCard key={p.id} person={p} note={note} size="base" />
        ))}
      </motion.ul>
    </Band>
  );
}

function PersonCard({
  person,
  note,
}: {
  person: TeamMember;
  note: string;
  size?: "lead" | "base";
}) {
  const hasBio = Boolean(person.bio && person.bio_confirmed);

  return (
    <motion.li
      variants={fadeUp}
      className="flex w-[252px] shrink-0 snap-start flex-col items-center rounded-xl border border-foreground/12 bg-foreground/[0.03] p-6 text-center transition-colors hover:border-cyan/35"
    >
      <Portrait
        person={person}
        className="size-32 rounded-full ring-1 ring-foreground/15"
        monogramClass="text-2xl"
      />

      <p className="mt-4 font-display text-[1.02rem] font-bold leading-tight text-foreground">
        {person.name}
      </p>
      <p className="mt-2 font-mono text-[0.55rem] uppercase leading-relaxed tracking-[0.2em] text-cyan">
        {person.title}
      </p>
      {hasBio ? (
        <p className="mt-3 text-[0.85rem] leading-relaxed text-gray-mid">{person.bio}</p>
      ) : (
        <p className="mt-4">
          <BioMarker note={note} />
        </p>
      )}
    </motion.li>
  );
}

/* ── 7 · Regional reach — light ───────────────────────────────────────── */

export function AbRegionalReach() {
  const c = useSection("regional_reach", SLUG);
  const theme = themeOf(c, "light");
  const facts = list<Fact>(c, "facts", []);

  return (
    <Band
      theme={theme}
      label="Regional reach"
      sheet="Sheet 04 · Reach"
      diagram="rocket"
      diagramPosition="left"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Regional Reach")}
        headline={str(c, "headline", "Beyond Pakistan.")}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]"
      >
        <motion.p
          variants={fadeUp}
          className="max-w-2xl text-[1.02rem] leading-relaxed text-navy-900/80"
        >
          {str(c, "body", "")}
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-navy-950/15 bg-white/55 p-6"
        >
          <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.26em] text-navy-900/60">
            {str(c, "partner_label", "Delivery partner")}
          </p>
          <p className="mt-2 font-display text-xl font-bold text-navy-950">
            {str(c, "partner_name", "Prime Edge")}
          </p>
          <dl className="mt-5 space-y-3">
            {facts.map((f) => (
              <div key={f.label} className="border-t border-navy-950/12 pt-3">
                <dt className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-navy-900/55">
                  {f.label}
                </dt>
                <dd className="mt-1 text-[0.92rem] text-navy-900/85">{f.value}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </motion.div>
    </Band>
  );
}

/* ── 8 · Closing CTA — dark ───────────────────────────────────────────── */

export function AbClosingCta() {
  const c = useSection("closing_cta", SLUG);
  const theme = themeOf(c, "dark");

  return (
    <Band theme={theme} label="Closing call to action">
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Next Step")}
        headline={str(c, "headline", "Bring It to Your Students.")}
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12 grid gap-6 lg:grid-cols-2"
      >
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
              href={str(c, "school_cta_target", "/schools")}
              className="inline-flex items-center gap-2 rounded-full border border-cyan/40 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-cyan transition-colors hover:bg-cyan/10"
            >
              {str(c, "school_cta_label", "Partner With Us")}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </motion.div>

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
          <div className="mt-7">
            <a
              href={str(c, "parent_cta_target", "/contact")}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold/10"
            >
              {str(c, "parent_cta_label", "Inquire")}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </motion.div>
      </motion.div>
    </Band>
  );
}
