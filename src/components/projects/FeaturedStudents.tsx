import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, UserRound } from "lucide-react";
import { Band, BandHeader, fadeUp, stagger } from "@/components/for-schools/Band";
import { LightboxShell, requestOpenProject } from "@/components/projects/LightboxShell";
import { str, useSection } from "@/lib/site-content";
import type { FeaturedStudent } from "@/lib/featured-students.functions";

const SLUG = "students";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function placeLine(s: FeaturedStudent): string {
  return [s.grade, s.school].filter(Boolean).join(" · ");
}

/**
 * "The Ones Who Ran With It" — photo-led student showcase.
 *
 * Every record arrives pre-filtered by the server: rows without confirmed
 * written parental consent are removed by the row-level policy, so no named
 * child can reach this component even when marked visible.
 */
export function PjFeaturedStudents({ students }: { students: FeaturedStudent[] }) {
  const c = useSection("featured_students", SLUG);
  const theme = c.theme === "light" ? "light" : "dark";
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (students.length === 0) return null;

  const few = students.length < 3;

  return (
    <Band
      theme={theme}
      label="Featured students"
      id="featured-students"
      sheet="Sheet 04 · Students"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Featured students")}
        headline={str(c, "headline", "The Ones Who Ran With It.")}
        subhead={str(c, "subhead", "Students whose achievements went further than expected.")}
      />

      <motion.ul
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.15 }}
        className={`mt-10 grid gap-5 sm:grid-cols-2 ${
          // With one or two students, centre a narrower grid rather than
          // leaving a stretched, half-empty row.
          few
            ? "mx-auto max-w-2xl"
            : students.length === 3
              ? "lg:grid-cols-3"
              : "lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {students.map((s, i) => (
          <motion.li key={s.id} variants={fadeUp}>
            <button
              type="button"
              onClick={() => setOpenAt(i)}
              aria-label={`View ${s.fullName}'s story`}
              className="group block w-full overflow-hidden rounded-xl border border-foreground/12 bg-navy-950/40 text-left transition hover:border-cyan/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan/60"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                {s.src ? (
                  <img
                    src={s.src}
                    srcSet={s.srcSet ?? undefined}
                    sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                    alt={s.alt}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ objectPosition: s.position }}
                    className="size-full select-none object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-gradient-to-b from-cyan/12 to-transparent">
                    <span className="font-display text-3xl font-semibold text-foreground/45">
                      {initials(s.fullName)}
                    </span>
                    <UserRound className="sr-only" aria-hidden />
                  </div>
                )}

                {/* Desktop: name rides a gradient; school, grade and the
                    "View" affordance surface on hover. */}
                <div className="pointer-events-none absolute inset-0 hidden [@media(hover:hover)]:block">
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-12 transition-all duration-200 group-hover:from-black/95 group-hover:via-black/65 group-focus-visible:from-black/95">
                    <p className="font-display text-[1rem] font-semibold leading-snug text-white">
                      {s.fullName}
                    </p>
                    <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-200 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-visible:grid-rows-[1fr] group-focus-visible:opacity-100">
                      <div className="overflow-hidden">
                        <p className="pt-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/70">
                          {placeLine(s)}
                        </p>
                        <span className="mt-2 inline-flex items-center gap-1 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-cyan">
                          View <ArrowUpRight className="size-3" aria-hidden />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Touch: no hover to rely on, so the detail stays put. */}
              <div className="px-4 py-3 [@media(hover:hover)]:hidden">
                <p className="font-display text-[0.95rem] font-semibold leading-snug text-foreground">
                  {s.fullName}
                </p>
                <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-gray-mid">
                  {placeLine(s)}
                </p>
              </div>
            </button>
          </motion.li>
        ))}
      </motion.ul>

      <StudentLightbox
        students={students}
        index={openAt}
        onIndex={setOpenAt}
        onClose={() => setOpenAt(null)}
        buildLinkLabel={str(c, "build_link_label", "See the story")}
      />
    </Band>
  );
}

function StudentLightbox({
  students,
  index,
  onIndex,
  onClose,
  buildLinkLabel,
}: {
  students: FeaturedStudent[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
  buildLinkLabel: string;
}) {
  const s = index === null ? null : students[index];

  return (
    <LightboxShell
      index={index}
      count={students.length}
      onIndex={onIndex}
      onClose={onClose}
      label={s ? `${s.fullName} — featured student` : "Featured student"}
      prevLabel="Previous student"
      nextLabel="Next student"
      contentKey={s?.id ?? "none"}
    >
      {s ? (
        <div className="grid w-full gap-5 rounded-xl border border-white/12 bg-navy-950/85 p-5 sm:p-7 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start">
          <div className="overflow-hidden rounded-lg border border-white/10">
            {s.full ? (
              <img
                src={s.full}
                alt={s.alt}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{ objectPosition: s.position }}
                className="max-h-[46vh] w-full select-none object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-gradient-to-b from-cyan/12 to-transparent">
                <span className="font-display text-5xl font-semibold text-foreground/40">
                  {initials(s.fullName)}
                </span>
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-[1.75rem]">
              {s.fullName}
            </h3>
            <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-cyan/80">
              {[s.age ? `Age ${s.age}` : null, s.grade, s.school].filter(Boolean).join(" · ")}
            </p>

            {s.achievement ? (
              <p className="mt-5 text-[0.95rem] leading-relaxed text-gray-mid">{s.achievement}</p>
            ) : null}

            {s.quote ? (
              <blockquote className="mt-5 border-l-2 border-cyan/50 pl-4 font-display text-[1.02rem] italic leading-relaxed text-foreground/90">
                “{s.quote}”
              </blockquote>
            ) : null}

            {s.projectId ? (
              <button
                type="button"
                onClick={() => {
                  const id = s.projectId as string;
                  onClose();
                  requestOpenProject(id);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan/40 px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-cyan transition hover:border-cyan hover:bg-cyan/10"
              >
                {buildLinkLabel} <ArrowUpRight className="size-3.5" aria-hidden />
              </button>
            ) : null}

            {students.length > 1 ? (
              <p className="mt-6 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-gray-mid/70">
                {(index ?? 0) + 1} / {students.length}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </LightboxShell>
  );
}
