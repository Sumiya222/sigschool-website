import { GraduationCap, BookOpen, Users, Trophy, ArrowUpRight } from "lucide-react";
import { Phase } from "@/components/immersive/Phase";
import { BentoTile } from "@/components/home/BentoTile";
import { cn } from "@/lib/utils";
import { useSiteContent, useSection, str } from "@/lib/site-content";

// Icons stay in code (they're chrome, not content) and are matched by mod code.
const ICONS: Record<string, typeof BookOpen> = {
  "MOD-01": BookOpen,
  "MOD-02": Users,
  "MOD-03": Trophy,
  "MOD-04": GraduationCap,
};

// Three pillars that round out the academic day — parallel offerings, shown as equals.
// Fallbacks only; live copy lives in the `programs` table.
const FALLBACK_PUBLIC = [
  {
    mod_code: "MOD-01",
    name: "Core Academics",
    badge_label: "OUR PROGRAMS",
    description:
      "Rigorous coursework across literacy, mathematics, science, and the humanities — sequenced from Kindergarten through Grade 12 to build real mastery, not just test scores.",
    tags: ["Reading & Writing", "Math & Science", "Humanities", "Research Skills"],
  },
  {
    mod_code: "MOD-02",
    name: "Clubs & Enrichment",
    badge_label: "OUR PROGRAMS",
    description:
      "From coding club to debate to the student newspaper — dozens of ways for students to follow their curiosity outside the regular class day.",
    tags: ["Coding Club", "Debate", "Student Newspaper", "Community Service"],
  },
  {
    mod_code: "MOD-03",
    name: "Athletics & Arts",
    badge_label: "OUR PROGRAMS",
    description:
      "Team sports, visual and performing arts, and physical education woven into every division — building confidence on the field and on stage.",
    tags: ["Team Sports", "Visual Arts", "Music & Theater", "Wellness"],
  },
];

const FALLBACK_ACADEMY = {
  mod_code: "MOD-04",
  name: "College & Career Counseling",
  badge_label: "SIGNATURE",
  description:
    "Dedicated counselors guide every Upper School student through course planning, college applications, and career exploration — support that starts well before senior year.",
  tags: ["1:1 Counseling", "College Planning", "Career Exploration", "Test Prep"],
};

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-white/8 bg-navy-800/60 px-2.5 py-1 font-mono text-[0.7rem] text-gray-mid transition-colors group-hover:text-offwhite/90">
      {label}
    </span>
  );
}

export function Programs() {
  const { programs } = useSiteContent();
  const c = useSection("four_programs");

  const rows = programs.filter((p) => p.visible);
  const academy = rows.find((p) => p.badge_label === "SIGNATURE") ?? FALLBACK_ACADEMY;
  const publicPrograms = rows.filter((p) => p.badge_label !== "SIGNATURE");
  const cards = publicPrograms.length > 0 ? publicPrograms : FALLBACK_PUBLIC;
  const AcademyIcon = ICONS[academy.mod_code] ?? GraduationCap;

  return (
    <Phase
      id="programs"
      code={str(c, "code", "01")}
      label={str(c, "eyebrow", "OUR PROGRAMS")}
      title={
        <>
          {str(c, "headline", "A Full Day,")}{" "}
          <span className="text-cosmic">{str(c, "headline_gradient", "Well Spent.")}</span>
        </>
      }
      lead={str(
        c,
        "subhead",
        "Academics anchor every day, supported by technology fluency, character and practical real-world readiness.",
      )}
    >
      {/* Three parallel public programs — equal-weight cards, no dead space */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((p, i) => {
          const flagship = p.badge_label === "FLAGSHIP";
          const Icon = ICONS[p.mod_code] ?? BookOpen;
          return (
            <BentoTile
              key={p.name}
              index={i}
              accent={flagship ? "cyan" : "indigo"}
              className={cn(
                flagship &&
                  "border-cyan/35 shadow-[0_0_50px_-18px_color-mix(in_oklab,var(--cyan)_60%,transparent)]",
              )}
              contentClassName="flex flex-col p-6 lg:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="telemetry text-gray-body">{p.mod_code}</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
                    flagship ? "border-cyan/30 bg-cyan/5" : "border-white/10",
                  )}
                >
                  <span className="led size-1 rounded-full bg-cyan" />
                  <span className="telemetry text-cyan">{p.badge_label}</span>
                </span>
              </div>

              <span
                className={cn(
                  "mt-6 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6",
                  flagship ? "bg-cyan/15 text-cyan-bright" : "bg-gold/15 text-gold",
                )}
              >
                <Icon className="size-6" />
              </span>

              <h3 className="mt-5 font-display text-subheading font-semibold text-foreground">
                {p.name}
              </h3>
              <p className="mt-3 text-body leading-relaxed text-gray-mid">{p.description}</p>

              <div className="mt-auto flex flex-wrap gap-2 pt-6">
                {p.tags.map((s) => (
                  <Chip key={s} label={s} />
                ))}
              </div>
            </BentoTile>
          );
        })}
      </div>

      {/* Signature support offering — full-width horizontal card */}
      <div className="mt-5">
        <BentoTile
          index={3}
          accent="indigo"
          contentClassName="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:gap-10 lg:p-8"
        >
          <div className="flex-1">
            <div className="flex items-center justify-between gap-4">
              <span className="telemetry text-gray-body">{academy.mod_code}</span>
              <span className="flex items-center gap-2 lg:hidden">
                <span className="flex items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/5 px-2.5 py-1">
                  <span className="led size-1 rounded-full bg-cyan" />
                  <span className="telemetry text-cyan">FEATURED</span>
                </span>
                <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1">
                  <span className="led size-1 rounded-full bg-gold-bright" />
                  <span className="telemetry text-gold-bright">SIGNATURE</span>
                </span>
              </span>
            </div>

            <div className="mt-5 flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-bright transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <AcademyIcon className="size-6" />
              </span>
              <div>
                <h3 className="font-display text-heading font-semibold text-foreground">
                  {academy.name}
                </h3>
                <p className="mt-2 max-w-2xl text-body leading-relaxed text-gray-mid">
                  {academy.description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-4 border-white/8 lg:items-end lg:border-l lg:pl-10">
            <span className="hidden items-center gap-2 lg:flex">
              <span className="flex items-center gap-1.5 rounded-full border border-cyan/30 bg-cyan/5 px-2.5 py-1">
                <span className="led size-1 rounded-full bg-cyan" />
                <span className="telemetry text-cyan">FEATURED</span>
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1">
                <span className="led size-1 rounded-full bg-gold-bright" />
                <span className="telemetry text-gold-bright">SIGNATURE</span>
              </span>
            </span>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              {academy.tags.map((s: string) => (
                <Chip key={s} label={s} />
              ))}
            </div>
            <span className="mt-1 inline-flex items-center gap-1.5 font-mono text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-gold-bright">
              {str(c, "academy_footer_label", "Learn More")}
              <ArrowUpRight className="size-3.5" />
            </span>
          </div>
        </BentoTile>
      </div>
    </Phase>
  );
}
