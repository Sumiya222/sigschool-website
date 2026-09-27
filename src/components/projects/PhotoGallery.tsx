import { useMemo, useState } from "react";
import { Band, BandHeader } from "@/components/for-schools/Band";
import { LightboxShell } from "@/components/projects/LightboxShell";
import { str, useSection } from "@/lib/site-content";
import type { GalleryImage } from "@/lib/gallery.functions";

const SLUG = "students";

/** Consistent, locale-stable date rendering for the caption strip. */
function formatTaken(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function metaLine(img: GalleryImage): string | null {
  const parts = [img.location, formatTaken(img.taken_on)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Aspect variety so the grid reads as a gallery rather than a product list. */
function aspectOf(img: GalleryImage, index: number): string {
  if (img.width && img.height) {
    const r = img.width / img.height;
    if (r > 1.5) return "aspect-[16/10]";
    if (r < 0.85) return "aspect-[3/4]";
    return "aspect-[4/3]";
  }
  return ["aspect-[4/3]", "aspect-[3/4]", "aspect-[16/10]", "aspect-[1/1]"][index % 4];
}

/**
 * "From the Classroom" — the photo gallery.
 *
 * Every image arrives pre-filtered by the server: rows without confirmed
 * parental/school consent are removed by the row-level policy, so nothing
 * un-consented can reach this component even if it is marked visible.
 */
export function PjPhotoGallery({ images }: { images: GalleryImage[] }) {
  const c = useSection("photo_gallery", SLUG);
  const theme = c.theme === "light" ? "light" : "dark";
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <Band
      theme={theme}
      label="Classroom photo gallery"
      id="classroom-gallery"
      sheet="Sheet 03 · Gallery"
    >
      <BandHeader
        theme={theme}
        eyebrow={str(c, "eyebrow", "Gallery")}
        headline={str(c, "headline", "Around Campus.")}
        subhead={str(
          c,
          "subhead",
          "Classrooms, performances and everyday moments across every division.",
        )}
      />

      <ul className="mt-10 gap-4 [column-fill:_balance] columns-1 sm:columns-2 lg:columns-3 xl:columns-4">
        {images.map((img, i) => {
          const meta = metaLine(img);
          return (
            <li key={img.id} className="mb-4 break-inside-avoid">
              <button
                type="button"
                onClick={() => setOpenAt(i)}
                className="group block w-full overflow-hidden rounded-xl border border-foreground/12 bg-navy-950/40 text-left transition hover:border-cyan/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan/60"
              >
                <div className={`relative w-full overflow-hidden ${aspectOf(img, i)}`}>
                  <img
                    src={img.src}
                    srcSet={img.srcSet}
                    sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
                    alt={img.alt}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="size-full select-none object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  {/* Desktop: caption rides in on a gradient. Suppressed where
                      hover does not exist, since it could never be revealed. */}
                  <div className="pointer-events-none absolute inset-0 hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:hover)]:block">
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-4 pt-10">
                      <p className="text-[0.86rem] font-medium leading-snug text-white">
                        {img.caption}
                      </p>
                      {meta ? (
                        <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-white/65">
                          {meta}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
                {/* Touch: no hover to rely on, so the caption stays put. */}
                <div className="px-3.5 py-3 [@media(hover:hover)]:hidden">
                  <p className="text-[0.85rem] leading-snug text-foreground">{img.caption}</p>
                  {meta ? (
                    <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-gray-mid">
                      {meta}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <GalleryLightbox
        images={images}
        index={openAt}
        onIndex={setOpenAt}
        onClose={() => setOpenAt(null)}
      />
    </Band>
  );
}

function GalleryLightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: GalleryImage[];
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const count = images.length;
  const img = index === null ? null : images[index];
  const meta = useMemo(() => (img ? metaLine(img) : null), [img]);

  return (
    <LightboxShell
      index={index}
      count={count}
      onIndex={onIndex}
      onClose={onClose}
      label={img?.caption || "Classroom photograph"}
      prevLabel="Previous photograph"
      nextLabel="Next photograph"
      contentKey={img?.id ?? "none"}
    >
      {img ? (
        <figure className="flex w-full flex-col items-center gap-4">
          <img
            src={img.full}
            alt={img.alt}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="max-h-[62vh] w-auto max-w-full select-none rounded-lg object-contain shadow-2xl"
          />
          <figcaption className="w-full max-w-2xl rounded-lg border border-white/12 bg-navy-950/80 p-5 text-center">
            <p className="font-display text-lg font-semibold text-foreground">{img.caption}</p>
            {meta ? (
              <p className="mt-1.5 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-cyan/80">
                {meta}
              </p>
            ) : null}
            {img.description ? (
              <p className="mt-3 text-[0.92rem] leading-relaxed text-gray-mid">{img.description}</p>
            ) : null}
            {count > 1 ? (
              <p className="mt-4 font-mono text-[0.55rem] uppercase tracking-[0.22em] text-gray-mid/70">
                {(index ?? 0) + 1} / {count}
              </p>
            ) : null}
          </figcaption>
        </figure>
      ) : null}
    </LightboxShell>
  );
}
