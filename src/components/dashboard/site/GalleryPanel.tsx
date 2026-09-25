import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { EyeOff, ImagePlus, ShieldAlert, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  IconButton,
  LoadingState,
  Modal,
  Panel,
  TextArea,
  TextInput,
  Toggle,
  useToast,
} from "@/components/dashboard/ui";
import { useMediaUrls } from "./MediaLibrary";
import type { MediaItem } from "./MediaLibrary";
import { toWebP } from "@/lib/image-webp";
import { uploadSiteMedia } from "@/lib/site-media.functions";
import { readAsBase64 } from "@/lib/read-as-base64";
import { checkImageDimensions } from "@/lib/image-dimensions";

interface GalleryRow {
  id: string;
  media_id: string | null;
  caption: string;
  description: string | null;
  location: string | null;
  taken_on: string | null;
  order: number;
  visible: boolean;
  consent_confirmed: boolean;
}

const CONSENT_LABEL = "Parental/school consent confirmed for public use";
const CONSENT_HELP =
  "This photo will not appear on the website until this is ticked. Only tick it if you have written permission to publish this child's image publicly.";

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

export function GalleryPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<GalleryRow[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<GalleryRow | null>(null);
  const [draft, setDraft] = useState<Partial<GalleryRow>>({});
  const [confirm, setConfirm] = useState<GalleryRow | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadFn = useServerFn(uploadSiteMedia);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [g, m] = await Promise.all([
      supabase
        .from("gallery_images")
        .select(
          "id, media_id, caption, description, location, taken_on, order, visible, consent_confirmed",
        )
        .order("order")
        .order("id"),
      supabase.from("media").select("id, storage_path, alt_text, tag, width, height, created_at"),
    ]);
    setErr(g.error ? toSafeErrorMessage(g.error, "Could not load the gallery.") : null);
    setRows((g.data as GalleryRow[]) ?? []);
    setMedia((m.data as MediaItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const urls = useMediaUrls(media);

  async function patch(id: string, values: Partial<GalleryRow>) {
    const { error } = await verifyRowsAffected(
      supabase.from("gallery_images").update(values).eq("id", id),
    );
    if (error) toast(toSafeErrorMessage(error, "Could not update that photo."), "error");
    return !error;
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    let next = (rows[rows.length - 1]?.order ?? 0) + 1;
    let added = 0;
    for (const original of Array.from(files)) {
      // Checked from the header, before any decode — see MediaLibrary.tsx.
      const dimError = await checkImageDimensions(original);
      if (dimError) {
        toast(dimError, "error");
        continue;
      }
      // Re-encode to WebP in the browser so storage only ever holds WebP.
      // This is an optimisation, not a security control — uploadSiteMedia()
      // independently sniffs and validates whatever bytes actually arrive.
      const file = await toWebP(original);
      const dims = await readDimensions(file);
      const base64 = await readAsBase64(file);
      const result = await uploadFn({ data: { base64, filename: file.name, folder: "gallery" } });
      if (!result.ok) {
        toast(result.reason, "error");
        continue;
      }
      const path = result.path;
      const caption = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const { data: mediaRow, error: mErr } = await supabase
        .from("media")
        .insert({
          storage_path: path,
          alt_text: caption || "Classroom photograph",
          tag: "gallery",
          width: dims?.width ?? null,
          height: dims?.height ?? null,
          uploaded_by: userData.user?.id ?? null,
        })
        .select("id")
        .single();
      if (mErr || !mediaRow) {
        toast(toSafeErrorMessage(mErr, "Upload failed."), "error");
        continue;
      }
      const { error } = await supabase.from("gallery_images").insert({
        media_id: mediaRow.id,
        caption,
        order: next++,
        visible: false,
        consent_confirmed: false,
      });
      if (error)
        toast(toSafeErrorMessage(error, "Could not add that photo to the gallery."), "error");
      else added += 1;
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (added > 0) {
      toast(
        `${added} ${added === 1 ? "photo" : "photos"} added. Confirm consent before publishing.`,
      );
      refresh();
    }
  }

  async function move(from: number, to: number) {
    const a = rows[from];
    const b = rows[to];
    if (!a || !b) return;
    await patch(a.id, { order: b.order });
    await patch(b.id, { order: a.order });
    refresh();
  }

  async function remove(r: GalleryRow) {
    setConfirm(null);
    const { error } = await verifyRowsAffected(
      supabase.from("gallery_images").delete().eq("id", r.id),
    );
    if (error) return toast(toSafeErrorMessage(error, "Could not remove that photo."), "error");
    toast("Photo removed from the gallery.");
    refresh();
  }

  const field = <K extends keyof GalleryRow>(k: K): GalleryRow[K] =>
    (draft[k] ?? editing?.[k] ?? "") as GalleryRow[K];
  const edit = (k: keyof GalleryRow, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    if (!editing) return;
    const ok = await patch(editing.id, draft);
    if (!ok) return;
    setEditing(null);
    setDraft({});
    toast("Photo details saved.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading gallery…" />;

  const blocked = rows.filter((r) => r.visible && !r.consent_confirmed).length;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Classroom gallery"
        hint="Photographs shown in the gallery on the Students page. A photo only ever appears publicly when it is shown on site and consent has been confirmed."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => upload(e.target.files)}
            />
            <Button
              variant="primary"
              icon={<ImagePlus className="size-3.5" />}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? "Uploading…" : "Upload photos"}
            </Button>
          </>
        }
      >
        {blocked > 0 && (
          <p className="mb-4 flex items-start gap-2 rounded-md border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)] px-3 py-2 text-[13px] text-[color:var(--bp-ink-2)]">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {blocked} {blocked === 1 ? "photo is" : "photos are"} set to show on site but held
              back because consent has not been confirmed. They are not visible to the public.
            </span>
          </p>
        )}

        {rows.length === 0 ? (
          <EmptyState
            title="No gallery photos yet"
            description="Upload photographs from sessions, builds and showcases. Nothing goes live until consent is confirmed."
            action={
              <Button variant="primary" onClick={() => fileRef.current?.click()}>
                Upload photos
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r, i) => {
              const live = r.visible && r.consent_confirmed;
              const thumb = r.media_id ? urls[r.media_id] : undefined;
              return (
                <li
                  key={r.id}
                  className={`flex flex-col overflow-hidden rounded-lg border bg-[color:var(--bp-paper-2)] ${
                    live
                      ? "border-[color:var(--bp-line-strong)]"
                      : "border-dashed border-[color:var(--bp-amber,#b4762a)]/70"
                  }`}
                >
                  <div className="relative aspect-[4/3] w-full bg-[color:var(--bp-paper)]">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={r.caption}
                        className={`size-full object-cover ${live ? "" : "opacity-55 grayscale"}`}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <ImagePlus className="size-4 text-[color:var(--bp-muted)]" aria-hidden />
                      </div>
                    )}
                    {!live && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white">
                        {!r.consent_confirmed ? (
                          <>
                            <ShieldAlert className="size-3" aria-hidden /> Consent needed
                          </>
                        ) : (
                          <>
                            <EyeOff className="size-3" aria-hidden /> Hidden
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-display text-sm font-semibold text-[color:var(--bp-ink)]">
                      {r.caption || "Untitled photo"}
                    </p>
                    <p className="mt-1 text-[12px] text-[color:var(--bp-ink-2)]">
                      {[r.location, r.taken_on].filter(Boolean).join(" · ") ||
                        "No location or date set"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[color:var(--bp-line)] pt-3">
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditing(r);
                          setDraft({});
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => patch(r.id, { visible: !r.visible }).then(refresh)}
                      >
                        {r.visible ? "Hide" : "Show"}
                      </Button>
                      <span className="ml-auto flex items-center gap-1">
                        <IconButton
                          label="Move earlier"
                          disabled={i === 0}
                          onClick={() => move(i, i - 1)}
                        >
                          ↑
                        </IconButton>
                        <IconButton
                          label="Move later"
                          disabled={i === rows.length - 1}
                          onClick={() => move(i, i + 1)}
                        >
                          ↓
                        </IconButton>
                        <IconButton label="Remove photo" onClick={() => setConfirm(r)}>
                          <Trash2 className="size-4" aria-hidden />
                        </IconButton>
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={editing !== null}
        title={editing ? `Edit ${editing.caption || "photo"}` : ""}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Caption" help="One short line shown over the photo on the website.">
              <TextInput
                value={field("caption") as string}
                onChange={(e) => edit("caption", e.target.value)}
              />
            </Field>
            <Field
              label="Description"
              help="Longer text shown when a visitor opens the photo full screen."
            >
              <TextArea
                rows={4}
                value={(field("description") as string) ?? ""}
                onChange={(e) => edit("description", e.target.value)}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Location" help="Optional, e.g. ASAS International, F-8 Campus.">
                <TextInput
                  value={(field("location") as string) ?? ""}
                  onChange={(e) => edit("location", e.target.value)}
                />
              </Field>
              <Field label="Date taken" help="Optional. Shown as month and year.">
                <TextInput
                  type="date"
                  value={(field("taken_on") as string) ?? ""}
                  onChange={(e) => edit("taken_on", e.target.value || null)}
                />
              </Field>
            </div>
            <div className="space-y-3 border-t border-[color:var(--bp-line)] pt-4">
              <Toggle
                checked={(draft.consent_confirmed ?? editing.consent_confirmed) as boolean}
                onChange={(v) => edit("consent_confirmed", v)}
                label={CONSENT_LABEL}
                help={CONSENT_HELP}
              />
              <Toggle
                checked={(draft.visible ?? editing.visible) as boolean}
                onChange={(v) => edit("visible", v)}
                label="Shown on site"
                help="Even when this is on, the photo stays hidden until consent is confirmed."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save}>
                Save photo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Remove this photo from the gallery?"
        confirmLabel="Remove photo"
        description={
          confirm ? (
            <>
              <strong>{confirm.caption || "This photo"}</strong> will be removed from the gallery.
              The image itself stays in the Media Library. This cannot be undone.
            </>
          ) : (
            ""
          )
        }
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove(confirm)}
      />
    </div>
  );
}
