import { useCallback, useEffect, useState } from "react";
import { EyeOff, Plus, ShieldAlert, Trash2, UserRound } from "lucide-react";
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
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
  useToast,
} from "@/components/dashboard/ui";
import { ImagePicker, useMediaUrls } from "./MediaLibrary";
import type { MediaItem } from "./MediaLibrary";

interface StudentRow {
  id: string;
  full_name: string;
  age: number | null;
  school: string;
  grade: string | null;
  photo_media_id: string | null;
  achievement: string;
  quote: string | null;
  project_id: string | null;
  order: number;
  visible: boolean;
  consent_confirmed: boolean;
}

const COLUMNS =
  "id, full_name, age, school, grade, photo_media_id, achievement, quote, project_id, order, visible, consent_confirmed";

const CONSENT_LABEL = "Written parental consent confirmed for public use";
const CONSENT_HELP =
  "This student will not appear on the website until this is ticked. Only tick it if you hold written parental permission to publish this child's full name, photo and school publicly.";

const BLANK: Omit<StudentRow, "id"> = {
  full_name: "",
  age: null,
  school: "",
  grade: null,
  photo_media_id: null,
  achievement: "",
  quote: null,
  project_id: null,
  order: 0,
  visible: false,
  consent_confirmed: false,
};

export function FeaturedStudentsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<StudentRow> | null>(null);
  const [confirm, setConfirm] = useState<StudentRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [s, m, p] = await Promise.all([
      supabase.from("featured_students").select(COLUMNS).order("order").order("id"),
      supabase.from("media").select("id, storage_path, alt_text, tag, width, height, created_at"),
      supabase.from("projects").select("id, title").order("order").order("id"),
    ]);
    setErr(s.error ? toSafeErrorMessage(s.error, "Could not load featured students.") : null);
    setRows((s.data as StudentRow[]) ?? []);
    setMedia((m.data as MediaItem[]) ?? []);
    setProjects((p.data as { id: string; title: string }[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const urls = useMediaUrls(media);

  async function patch(id: string, values: Partial<StudentRow>) {
    const { error } = await verifyRowsAffected(
      supabase.from("featured_students").update(values).eq("id", id),
    );
    if (error) toast(toSafeErrorMessage(error, "Could not update that student."), "error");
    return !error;
  }

  async function move(from: number, to: number) {
    const a = rows[from];
    const b = rows[to];
    if (!a || !b) return;
    await patch(a.id, { order: b.order });
    await patch(b.id, { order: a.order });
    refresh();
  }

  async function remove(r: StudentRow) {
    setConfirm(null);
    const { error } = await verifyRowsAffected(
      supabase.from("featured_students").delete().eq("id", r.id),
    );
    if (error) return toast(toSafeErrorMessage(error, "Could not remove that student."), "error");
    toast("Student removed from the showcase.");
    refresh();
  }

  async function save() {
    if (!draft) return;
    if (!(draft.full_name ?? "").trim()) return toast("A full name is required.", "error");

    const values = {
      full_name: (draft.full_name ?? "").trim(),
      age: draft.age ?? null,
      school: (draft.school ?? "").trim(),
      grade: draft.grade || null,
      photo_media_id: draft.photo_media_id ?? null,
      achievement: (draft.achievement ?? "").trim(),
      quote: draft.quote || null,
      project_id: draft.project_id || null,
      visible: draft.visible ?? false,
      consent_confirmed: draft.consent_confirmed ?? false,
    };

    if (draft.id) {
      const ok = await patch(draft.id, values);
      if (!ok) return;
    } else {
      const order = (rows[rows.length - 1]?.order ?? 0) + 1;
      const { error } = await supabase.from("featured_students").insert({ ...values, order });
      if (error) return toast(toSafeErrorMessage(error, "Could not save that student."), "error");
    }
    setDraft(null);
    toast("Student saved.");
    refresh();
  }

  const set = (k: keyof StudentRow, v: unknown) => setDraft((d) => ({ ...(d ?? {}), [k]: v }));

  if (loading) return <LoadingState label="Loading featured students…" />;

  const blocked = rows.filter((r) => r.visible && !r.consent_confirmed).length;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Featured students"
        hint="The student showcase at the foot of the Students page. A student only ever appears publicly when they are shown on site and written parental consent has been confirmed."
        actions={
          <Button
            variant="primary"
            icon={<Plus className="size-3.5" />}
            onClick={() => setDraft({ ...BLANK })}
          >
            Add student
          </Button>
        }
      >
        {blocked > 0 && (
          <p className="mb-4 flex items-start gap-2 rounded-md border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)] px-3 py-2 text-[13px] text-[color:var(--bp-ink-2)]">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {blocked} {blocked === 1 ? "student is" : "students are"} set to show on site but held
              back because consent has not been confirmed. They are not visible to the public.
            </span>
          </p>
        )}

        {rows.length === 0 ? (
          <EmptyState
            title="No featured students yet"
            description="Add students whose builds went further than the brief. Nothing goes live until written parental consent is confirmed."
            action={
              <Button variant="primary" onClick={() => setDraft({ ...BLANK })}>
                Add student
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r, i) => {
              const live = r.visible && r.consent_confirmed;
              const thumb = r.photo_media_id ? urls[r.photo_media_id] : undefined;
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
                        alt={r.full_name}
                        className={`size-full object-cover ${live ? "" : "opacity-55 grayscale"}`}
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <UserRound className="size-5 text-[color:var(--bp-muted)]" aria-hidden />
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
                      {r.full_name || "Unnamed student"}
                    </p>
                    <p className="mt-1 text-[12px] text-[color:var(--bp-ink-2)]">
                      {[r.grade, r.school].filter(Boolean).join(" · ") || "No school or grade set"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[color:var(--bp-line)] pt-3">
                      <Button size="sm" onClick={() => setDraft({ ...r })}>
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
                        <IconButton label="Remove student" onClick={() => setConfirm(r)}>
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
        open={draft !== null}
        title={draft?.id ? `Edit ${draft.full_name || "student"}` : "Add a student"}
        onClose={() => setDraft(null)}
      >
        {draft && (
          <div className="space-y-4">
            <Field label="Full name" help="Shown publicly on the card and in the detail view.">
              <TextInput
                value={draft.full_name ?? ""}
                onChange={(e) => set("full_name", e.target.value)}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Age" help="Optional.">
                <TextInput
                  type="number"
                  min={3}
                  max={25}
                  value={draft.age ?? ""}
                  onChange={(e) =>
                    set("age", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </Field>
              <Field label="Grade" help="Optional, e.g. Grade 7.">
                <TextInput
                  value={draft.grade ?? ""}
                  onChange={(e) => set("grade", e.target.value)}
                />
              </Field>
              <Field label="School" help="The school shown beneath their name.">
                <TextInput
                  value={draft.school ?? ""}
                  onChange={(e) => set("school", e.target.value)}
                />
              </Field>
            </div>

            <ImagePicker
              label="Photograph"
              help="Choose from the Media Library. Set a focal point there so the face stays framed at every card size."
              value={draft.photo_media_id ?? null}
              onChange={(id) => set("photo_media_id", id)}
            />

            <Field
              label="Achievement"
              help="What they built or won, in full. Shown when a visitor opens their card."
            >
              <TextArea
                rows={4}
                value={draft.achievement ?? ""}
                onChange={(e) => set("achievement", e.target.value)}
              />
            </Field>

            <Field
              label="Quote"
              help="Optional. In the student's own words — shown in their voice, set apart from site copy."
            >
              <TextArea
                rows={3}
                value={draft.quote ?? ""}
                onChange={(e) => set("quote", e.target.value)}
              />
            </Field>

            <Field
              label="Linked build"
              help="Optional. Adds a link from their card to this project in the Build Log."
            >
              <SelectInput
                value={draft.project_id ?? ""}
                onChange={(e) => set("project_id", e.target.value || null)}
              >
                <option value="">No linked build</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="space-y-3 border-t border-[color:var(--bp-line)] pt-4">
              <Toggle
                checked={draft.consent_confirmed ?? false}
                onChange={(v) => set("consent_confirmed", v)}
                label={CONSENT_LABEL}
                help={CONSENT_HELP}
              />
              <Toggle
                checked={draft.visible ?? false}
                onChange={(v) => set("visible", v)}
                label="Shown on site"
                help="Even when this is on, the student stays hidden until consent is confirmed."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save}>
                Save student
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Remove this student from the showcase?"
        confirmLabel="Remove student"
        description={
          confirm ? (
            <>
              <strong>{confirm.full_name || "This student"}</strong> will be removed from the
              showcase. Their photo stays in the Media Library. This cannot be undone.
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
