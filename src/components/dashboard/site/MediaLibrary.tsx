import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Crop, Focus, Search, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fromCaught, toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { BUNDLED_ASSETS } from "@/lib/site-content";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  LoadingState,
  Modal,
  Panel,
  SelectInput,
  TextInput,
  useToast,
} from "@/components/dashboard/ui";
import { ImageEditor } from "./ImageEditor";
import { pageLabel, sectionLabel } from "@/lib/cms-schema";
import { toWebP } from "@/lib/image-webp";
import { uploadSiteMedia } from "@/lib/site-media.functions";
import { readAsBase64 } from "@/lib/read-as-base64";
import { checkImageDimensions } from "@/lib/image-dimensions";

export interface MediaItem {
  id: string;
  storage_path: string;
  alt_text: string;
  tag: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface MediaUsage {
  where: string;
  detail: string;
}

const FOCAL_SETTING_KEY = "_media_focal_points";

export type FocalMap = Record<string, { x: number; y: number }>;

/** Resolve a media row to something an <img> can display. */
export function useMediaUrls(rows: MediaItem[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      const remote = rows.filter((r) => !r.storage_path.startsWith("asset:"));
      for (const r of rows) {
        if (r.storage_path.startsWith("asset:")) {
          const bundled = BUNDLED_ASSETS[r.storage_path.slice(6)];
          if (bundled) next[r.id] = bundled;
        }
      }
      if (remote.length) {
        const { data } = await supabase.storage.from("site-media").createSignedUrls(
          remote.map((r) => r.storage_path),
          3600,
        );
        for (const [i, entry] of (data ?? []).entries()) {
          const row = remote[i];
          if (row && entry?.signedUrl) next[row.id] = entry.signedUrl;
        }
      }
      if (!cancelled) setUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  return urls;
}

export async function loadFocalPoints(): Promise<FocalMap> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", FOCAL_SETTING_KEY)
    .maybeSingle();
  const raw = data?.value;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as FocalMap;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as FocalMap;
    } catch {
      return {};
    }
  }
  return {};
}

export async function saveFocalPoints(map: FocalMap) {
  const { error } = await supabase
    .from("site_settings")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert({ key: FOCAL_SETTING_KEY, value: map as any }, { onConflict: "key" });
  if (error) throw error;
}

/* ── Library ────────────────────────────────────────────────────────────── */

export function MediaLibrary() {
  const toast = useToast();
  const [rows, setRows] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, MediaUsage[]>>({});
  const [focal, setFocal] = useState<FocalMap>({});

  const [uploadOpen, setUploadOpen] = useState(false);

  const urls = useMediaUrls(rows);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("media")
      .select("id, storage_path, alt_text, tag, width, height, created_at")
      .order("created_at", { ascending: false });
    if (error) setErr(toSafeErrorMessage(error, "Could not load the media library."));
    setRows((data as MediaItem[]) ?? []);
    setLoading(false);
  }, []);

  const refreshUsage = useCallback(async () => {
    // Every table with a media_id/logo_media_id/photo_media_id FK must be
    // checked here — this is what the delete dialog below relies on to warn
    // "still in use" before the attempt, not just to explain a failure after
    // the fact. It previously missed affiliations/leadership/gallery_images/
    // featured_students entirely, so deleting a media item referenced only
    // by one of those showed no warning at all and failed silently generic
    // once the FKs backing this were tightened to RESTRICT.
    const [
      projects,
      partners,
      carousel,
      sections,
      affiliationsRes,
      leadershipRes,
      galleryRes,
      studentsRes,
    ] = await Promise.all([
      supabase.from("projects").select("title, media_id"),
      supabase.from("partners_schools").select("name, logo_media_id"),
      supabase.from("hero_carousel").select("media_id"),
      supabase.from("page_sections").select("page_slug, section_key, content"),
      supabase.from("affiliations").select("name, logo_media_id"),
      supabase.from("leadership").select("name, media_id"),
      supabase.from("gallery_images").select("caption, media_id"),
      supabase.from("featured_students").select("full_name, photo_media_id"),
    ]);
    const map: Record<string, MediaUsage[]> = {};
    const add = (id: string | null | undefined, entry: MediaUsage) => {
      if (!id) return;
      (map[id] ??= []).push(entry);
    };
    for (const p of projects.data ?? []) add(p.media_id, { where: "Projects", detail: p.title });
    for (const p of partners.data ?? [])
      add(p.logo_media_id, { where: "Partner schools", detail: p.name });
    for (const h of carousel.data ?? [])
      add(h.media_id, { where: "Home", detail: "Hero image strip" });
    for (const s of sections.data ?? []) {
      const json = JSON.stringify(s.content ?? {});
      for (const r of rows) {
        if (json.includes(r.id)) {
          add(r.id, { where: pageLabel(s.page_slug), detail: sectionLabel(s.section_key) });
        }
      }
    }
    for (const a of affiliationsRes.data ?? [])
      add(a.logo_media_id, { where: "Affiliations", detail: a.name });
    for (const l of leadershipRes.data ?? [])
      add(l.media_id, { where: "Leadership", detail: l.name });
    for (const g of galleryRes.data ?? [])
      add(g.media_id, { where: "Gallery", detail: g.caption || "Untitled image" });
    for (const s of studentsRes.data ?? [])
      add(s.photo_media_id, { where: "Featured students", detail: s.full_name });
    setUsage(map);
  }, [rows]);

  useEffect(() => {
    refresh();
    loadFocalPoints()
      .then(setFocal)
      .catch(() => setFocal({}));
  }, [refresh]);

  useEffect(() => {
    if (rows.length) refreshUsage();
  }, [rows, refreshUsage]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.tag) set.add(r.tag);
    return [...set].sort();
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (tagFilter !== "all" && (r.tag ?? "") !== tagFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${r.alt_text} ${r.tag ?? ""}`.toLowerCase().includes(q);
  });

  const open = rows.find((r) => r.id === openId) ?? null;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}

      <Panel
        title="Image library"
        hint="Every picture used anywhere on the public website."
        actions={
          <Button
            variant="primary"
            icon={<Upload className="size-3.5" />}
            onClick={() => setUploadOpen(true)}
          >
            Upload image
          </Button>
        }
      >
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Field label="Search" help="Search by description or category.">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--bp-muted)]" />
                <TextInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search images…"
                  className="pl-9"
                />
              </div>
            </Field>
          </div>
          <div className="w-[200px]">
            <Field label="Category" help="Narrow the grid to one category.">
              <SelectInput value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="all">All categories</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading images…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? "No images yet" : "Nothing matches that search"}
            description={
              rows.length === 0
                ? "Upload your first picture to start building the library."
                : "Try a different word or clear the category filter."
            }
            action={
              rows.length === 0 ? (
                <Button variant="primary" onClick={() => setUploadOpen(true)}>
                  Upload image
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(m.id)}
                  className="group w-full overflow-hidden rounded-lg border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] text-left transition hover:border-[color:var(--bp-indigo)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--bp-paper)]">
                    {urls[m.id] ? (
                      <img
                        src={urls[m.id]}
                        alt={m.alt_text}
                        loading="lazy"
                        className="size-full object-cover transition group-hover:scale-[1.03]"
                        style={
                          focal[m.id]
                            ? { objectPosition: `${focal[m.id].x * 100}% ${focal[m.id].y * 100}%` }
                            : undefined
                        }
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center font-mono text-[10px] uppercase tracking-widest text-[color:var(--bp-muted)]">
                        Loading…
                      </div>
                    )}
                    {focal[m.id] && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
                        <Focus className="size-3" aria-hidden /> Focal point set
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-xs leading-relaxed text-[color:var(--bp-ink)]">
                      {m.alt_text}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-mono text-[10px] uppercase tracking-widest text-[color:var(--bp-muted)]">
                        {m.tag ?? "Uncategorised"}
                      </span>
                      <span className="font-mono text-[10px] text-[color:var(--bp-muted)]">
                        {(usage[m.id]?.length ?? 0) > 0 ? `Used ${usage[m.id].length}×` : "Unused"}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onDone={() => {
          setUploadOpen(false);
          toast("Image uploaded.");
          refresh();
        }}
      />

      {open && (
        <ImageEditor
          item={open}
          url={urls[open.id]}
          usage={usage[open.id] ?? []}
          focal={focal[open.id] ?? null}
          onClose={() => setOpenId(null)}
          onChanged={() => {
            refresh();
          }}
          onFocalChange={async (point: { x: number; y: number } | null) => {
            const next = { ...focal };
            if (point) next[open.id] = point;
            else delete next[open.id];
            setFocal(next);
            try {
              await saveFocalPoints(next);
              toast(point ? "Focal point saved." : "Focal point cleared.");
            } catch (e) {
              toast(toSafeErrorMessage(fromCaught(e), "Could not save focal point."), "error");
            }
          }}
        />
      )}
    </div>
  );
}

/* ── Upload ─────────────────────────────────────────────────────────────── */

function UploadDialog({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useServerFn(uploadSiteMedia);

  useEffect(() => {
    if (open) {
      setFile(null);
      setAlt("");
      setTag("");
      setErr(null);
    }
  }, [open]);

  async function submit() {
    setErr(null);
    if (!file) return setErr("Choose a picture first.");
    if (!alt.trim()) return setErr("A description is required so the site stays accessible.");
    // Checked from the header, before any decode — a huge declared pixel
    // size would otherwise force a full-resolution decode in this browser
    // tab (toWebP() and readDimensions() below both decode the image).
    const dimError = await checkImageDimensions(file);
    if (dimError) return setErr(dimError);
    setBusy(true);
    // Every uploaded picture is re-encoded to WebP before it reaches storage.
    // This is an optimisation, not a security control — uploadSiteMedia()
    // independently sniffs and validates whatever bytes actually arrive.
    const optimised = await toWebP(file);
    const dims = await readDimensions(optimised);
    const base64 = await readAsBase64(optimised);
    const result = await upload({ data: { base64, filename: optimised.name } });
    if (!result.ok) {
      setBusy(false);
      return setErr(result.reason);
    }
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("media").insert({
      storage_path: result.path,
      alt_text: alt.trim(),
      tag: tag.trim() || null,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      uploaded_by: userData.user?.id ?? null,
    });
    setBusy(false);
    if (error) return setErr(toSafeErrorMessage(error, "Could not save that image."));
    onDone();
  }

  return (
    <Modal open={open} title="Upload an image" onClose={onClose} width={560}>
      <div className="space-y-5">
        {err && <ErrorNote>{err}</ErrorNote>}
        <Field label="Picture file" help="JPEG, PNG or WebP works best.">
          <div className="flex items-center gap-3">
            <Button onClick={() => inputRef.current?.click()}>Choose file</Button>
            <span className="truncate text-sm text-[color:var(--bp-ink-2)]">
              {file ? file.name : "No file chosen"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </Field>
        <Field
          label="Description (required)"
          help="Describe what the picture shows. Screen readers read this aloud, and it appears if the image fails to load."
        >
          <TextInput
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Students assembling a line-following robot"
          />
        </Field>
        <Field
          label="Category"
          help="Optional. Used to group and filter images, e.g. classroom or partners."
        >
          <TextInput value={tag} onChange={(e) => setTag(e.target.value)} placeholder="classroom" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={submit}>
            {busy ? "Uploading…" : "Upload image"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/* ── Picker (used by the section editor) ────────────────────────────────── */

export function ImagePicker({
  value,
  onChange,
  label,
  help,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  label: string;
  help?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const urls = useMediaUrls(rows);

  useEffect(() => {
    supabase
      .from("media")
      .select("id, storage_path, alt_text, tag, width, height, created_at")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data as MediaItem[]) ?? []));
  }, []);

  const current = rows.find((r) => r.id === value) ?? null;
  const filtered = rows.filter((r) =>
    `${r.alt_text} ${r.tag ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <Field label={label} help={help}>
      <div className="flex items-center gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-md border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)]">
          {current && urls[current.id] ? (
            <img src={urls[current.id]} alt={current.alt_text} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center font-mono text-[9px] uppercase tracking-widest text-[color:var(--bp-muted)]">
              None
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setOpen(true)}>
            {current ? "Change image" : "Choose image"}
          </Button>
          {current && (
            <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>

      <Modal open={open} title="Choose an image" onClose={() => setOpen(false)}>
        <div className="space-y-4">
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images…"
          />
          {filtered.length === 0 ? (
            <EmptyState
              title="No images match"
              description="Upload pictures from the Media Library first."
            />
          ) : (
            <ul className="grid max-h-[420px] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className={
                      "w-full overflow-hidden rounded-md border transition " +
                      (m.id === value
                        ? "border-[color:var(--bp-indigo)]"
                        : "border-[color:var(--bp-line-strong)] hover:border-[color:var(--bp-indigo)]")
                    }
                  >
                    <span className="block aspect-square bg-[color:var(--bp-paper)]">
                      {urls[m.id] && (
                        <img src={urls[m.id]} alt={m.alt_text} className="size-full object-cover" />
                      )}
                    </span>
                    <span className="block truncate p-1.5 text-[10px] text-[color:var(--bp-muted)]">
                      {m.alt_text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </Field>
  );
}

/* ── Delete guard used by the editor ────────────────────────────────────── */

export function DeleteMediaDialog({
  open,
  item,
  usage,
  onCancel,
  onDeleted,
}: {
  open: boolean;
  item: MediaItem;
  usage: MediaUsage[];
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const inUse = usage.length > 0;

  async function doDelete() {
    const { error } = await verifyRowsAffected(supabase.from("media").delete().eq("id", item.id));
    if (error) {
      if (error.code === "23503") {
        toast(
          "Cannot delete this image — it's still referenced somewhere. Refresh and check its usage again.",
          "error",
        );
      } else {
        toast(toSafeErrorMessage(error, "Could not delete that image."), "error");
      }
      return;
    }
    if (!item.storage_path.startsWith("asset:")) {
      await supabase.storage.from("site-media").remove([item.storage_path]);
    }
    toast("Image deleted.");
    onDeleted();
  }

  if (inUse) {
    return (
      <Modal open={open} title="This image is still in use" onClose={onCancel} width={520}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-[color:var(--bp-ink-2)]">
            It cannot be deleted until it has been removed from the places below.
          </p>
          <ul className="space-y-2">
            {usage.map((u, i) => (
              <li
                key={i}
                className="rounded-md border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)] px-3 py-2 text-sm text-[color:var(--bp-ink)]"
              >
                <span className="font-semibold">{u.where}</span> — {u.detail}
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button onClick={onCancel}>Close</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <ConfirmDialog
      open={open}
      title="Delete this image?"
      danger
      confirmLabel="Delete image"
      description={
        <>
          <strong>{item.alt_text}</strong> will be permanently removed from the library. This cannot
          be undone.
        </>
      }
      onCancel={onCancel}
      onConfirm={doDelete}
    />
  );
}

export { Trash2 as TrashIcon, Crop as CropIcon };
