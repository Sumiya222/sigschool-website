import { useCallback, useEffect, useState } from "react";
import { Camera, Plus, Star, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import {
  Button,
  ConfirmDialog,
  DragHandle,
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
  useDragReorder,
  useToast,
} from "@/components/dashboard/ui";
import { ImagePicker, useMediaUrls } from "./MediaLibrary";
import type { MediaItem } from "./MediaLibrary";
import { settingMeta } from "@/lib/cms-schema";
import { verifyRowsAffected } from "@/lib/db-write-verify";

/* ── Shared helpers ─────────────────────────────────────────────────────── */

function useCollection<T extends { id: string; order?: number }>(
  table: string,
  columns: string,
  orderBy = "order",
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(table as any) as any)
      .select(columns)
      .order(orderBy)
      .order("id");
    setErr(error ? toSafeErrorMessage(error, "Could not load that content.") : null);
    setRows((data as T[]) ?? []);
    setLoading(false);
  }, [table, columns, orderBy]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, setRows, loading, err, refresh };
}

async function patch(table: string, id: string, values: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return verifyRowsAffected((supabase.from(table as any) as any).update(values).eq("id", id));
}

function ItemCard({
  children,
  onRemove,
  removeLabel,
  index,
  count,
  onMove,
  dragProps,
  title,
  badge,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  index: number;
  count: number;
  onMove?: (from: number, to: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragProps?: any;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <li
      {...dragProps}
      className="rounded-lg border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] p-4 data-[dragging=true]:opacity-50"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onMove && <DragHandle />}
          <span className="font-display text-sm font-semibold text-[color:var(--bp-ink)]">
            {title}
          </span>
          {badge}
        </div>
        <div className="flex items-center gap-1.5">
          {onMove && (
            <>
              <IconButton
                label="Move up"
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
              >
                ↑
              </IconButton>
              <IconButton
                label="Move down"
                disabled={index === count - 1}
                onClick={() => onMove(index, index + 1)}
              >
                ↓
              </IconButton>
            </>
          )}
          {onRemove && (
            <IconButton label={removeLabel ?? "Remove"} onClick={onRemove}>
              <Trash2 className="size-4" aria-hidden />
            </IconButton>
          )}
        </div>
      </div>
      {children}
    </li>
  );
}

/** Reorder two rows by swapping their `order` values. */
async function swapOrder(
  table: string,
  rows: { id: string; order: number }[],
  from: number,
  to: number,
  after: () => void,
) {
  const a = rows[from];
  const b = rows[to];
  if (!a || !b) return;
  await patch(table, a.id, { order: b.order });
  await patch(table, b.id, { order: a.order });
  after();
}

/* ── Statistics ─────────────────────────────────────────────────────────── */

interface StatRow {
  id: string;
  key: string;
  label: string;
  value: string;
  suffix: string | null;
  is_placeholder: boolean;
  order: number;
}

export function StatisticsPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<StatRow>(
    "site_stats",
    "id, key, label, value, suffix, is_placeholder, order",
  );
  const [draft, setDraft] = useState<Record<string, Partial<StatRow>>>({});

  const value = (r: StatRow, k: keyof StatRow) => (draft[r.id]?.[k] ?? r[k] ?? "") as string;
  const edit = (r: StatRow, k: keyof StatRow, v: unknown) =>
    setDraft((d) => ({ ...d, [r.id]: { ...d[r.id], [k]: v } }));

  async function save(r: StatRow) {
    const changes = draft[r.id];
    if (!changes) return;
    const { error } = await patch("site_stats", r.id, changes);
    if (error) return toast(toSafeErrorMessage(error, "Could not save that figure."), "error");
    setDraft((d) => {
      const next = { ...d };
      delete next[r.id];
      return next;
    });
    toast("Figure saved.");
    refresh();
  }

  async function togglePlaceholder(r: StatRow) {
    const { error } = await patch("site_stats", r.id, { is_placeholder: !r.is_placeholder });
    if (error) return toast(toSafeErrorMessage(error, "Could not update that figure."), "error");
    toast(r.is_placeholder ? "Marked as final." : "Marked as placeholder.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading figures…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel title="Headline figures" hint="These numbers appear across the public website.">
        {rows.length === 0 ? (
          <EmptyState
            title="No figures yet"
            description="Add your first figure to show it on the site."
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((r, i) => (
              <ItemCard
                key={r.id}
                index={i}
                count={rows.length}
                title={r.label || "Untitled figure"}
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Caption" help="The wording shown beneath the number.">
                    <TextInput
                      value={value(r, "label")}
                      onChange={(e) => edit(r, "label", e.target.value)}
                    />
                  </Field>
                  <Field label="Figure" help="The number or wording itself, e.g. 23,000.">
                    <TextInput
                      value={value(r, "value")}
                      onChange={(e) => edit(r, "value", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Ending"
                    help="Anything shown straight after the figure, e.g. + or %."
                  >
                    <TextInput
                      value={value(r, "suffix")}
                      onChange={(e) => edit(r, "suffix", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t border-[color:var(--bp-line)] pt-4">
                  <Toggle
                    checked={r.is_placeholder}
                    onChange={() => togglePlaceholder(r)}
                    label="Mark as placeholder"
                    help="While this is on, a note appears on the website telling visitors these figures aren't final yet. Turn it off once you've entered real data."
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!draft[r.id]}
                    onClick={() => save(r)}
                  >
                    Save figure
                  </Button>
                </div>
              </ItemCard>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ── Contact details ────────────────────────────────────────────────────── */

interface SettingRow {
  key: string;
  value: unknown;
}

export function ContactDetailsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("site_settings").select("key, value").order("key");
    if (error) setErr(toSafeErrorMessage(error, "Could not load those settings."));
    const list = ((data as SettingRow[]) ?? []).filter((r) => !r.key.startsWith("_"));
    setRows(list);
    setDraft(
      Object.fromEntries(
        list.map((r) => [r.key, typeof r.value === "string" ? r.value : String(r.value ?? "")]),
      ),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const dirty = rows.some(
    (r) => (draft[r.key] ?? "") !== (typeof r.value === "string" ? r.value : String(r.value ?? "")),
  );

  async function saveAll() {
    setSaving(true);
    for (const r of rows) {
      const current = typeof r.value === "string" ? r.value : String(r.value ?? "");
      if ((draft[r.key] ?? "") === current) continue;

      const { error } = await verifyRowsAffected(
        supabase
          .from("site_settings")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update({ value: draft[r.key] as any })
          .eq("key", r.key),
      );
      if (error) {
        setSaving(false);
        return toast(toSafeErrorMessage(error, "Could not save those settings."), "error");
      }
    }
    setSaving(false);
    toast("Contact details saved.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading contact details…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Contact & site-wide details"
        hint="These appear in the footer and anywhere the site shows how to reach you."
        actions={
          <Button variant="primary" disabled={!dirty || saving} onClick={saveAll}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      >
        <div className="grid gap-5 md:grid-cols-2">
          {rows.map((r) => {
            const meta = settingMeta(r.key);
            const long = meta.kind === "textarea" || (draft[r.key] ?? "").length > 80;
            return (
              <div key={r.key} className={long ? "md:col-span-2" : ""}>
                <Field label={meta.label} help={meta.help}>
                  {long ? (
                    <TextArea
                      value={draft[r.key] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })}
                    />
                  ) : (
                    <TextInput
                      value={draft[r.key] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

/* ── Programs ───────────────────────────────────────────────────────────── */

interface ProgramRow {
  id: string;
  name: string;
  mod_code: string;
  badge_label: string;
  description: string;
  tags: string[];
  order: number;
  visible: boolean;
}

export function ProgramsPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<ProgramRow>(
    "programs",
    "id, name, mod_code, badge_label, description, tags, order, visible",
  );
  const [draft, setDraft] = useState<Record<string, Partial<ProgramRow>>>({});
  const [confirm, setConfirm] = useState<ProgramRow | null>(null);
  const dragProps = useDragReorder((f, t) => swapOrder("programs", rows, f, t, refresh));

  const val = (r: ProgramRow, k: keyof ProgramRow) => (draft[r.id]?.[k] ?? r[k]) as never;
  const edit = (r: ProgramRow, k: keyof ProgramRow, v: unknown) =>
    setDraft((d) => ({ ...d, [r.id]: { ...d[r.id], [k]: v } }));

  async function save(r: ProgramRow) {
    const { error } = await patch("programs", r.id, draft[r.id] ?? {});
    if (error) return toast(toSafeErrorMessage(error, "Could not save that program."), "error");
    setDraft((d) => {
      const n = { ...d };
      delete n[r.id];
      return n;
    });
    toast("Programme saved.");
    refresh();
  }

  async function add() {
    const { error } = await supabase.from("programs").insert({
      name: "New programme",
      mod_code: "MOD-00",
      badge_label: "New",
      description: "",
      tags: [],
      order: (rows[rows.length - 1]?.order ?? 0) + 1,
    });
    if (error) return toast(toSafeErrorMessage(error, "Could not add that program."), "error");
    toast("Programme added.");
    refresh();
  }

  async function remove(r: ProgramRow) {
    const { error } = await verifyRowsAffected(supabase.from("programs").delete().eq("id", r.id));
    setConfirm(null);
    if (error) return toast(toSafeErrorMessage(error, "Could not delete that program."), "error");
    toast("Programme deleted.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading programmes…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Programmes"
        hint="The programme cards shown on the Home and Programs pages."
        actions={
          <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={add}>
            Add programme
          </Button>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No programmes yet"
            description="Add your first programme so it appears on the website."
            action={
              <Button variant="primary" onClick={add}>
                Add programme
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((r, i) => (
              <ItemCard
                key={r.id}
                index={i}
                count={rows.length}
                title={r.name}
                dragProps={dragProps(i)}
                onMove={(f, t) => swapOrder("programs", rows, f, t, refresh)}
                onRemove={() => setConfirm(r)}
                removeLabel="Delete programme"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Programme name" help="Shown as the card title.">
                    <TextInput
                      value={val(r, "name")}
                      onChange={(e) => edit(r, "name", e.target.value)}
                    />
                  </Field>
                  <Field label="Module code" help="The small code on the card, e.g. MOD-01.">
                    <TextInput
                      value={val(r, "mod_code")}
                      onChange={(e) => edit(r, "mod_code", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Badge wording"
                    help="The pill shown in the card corner, e.g. Summer."
                  >
                    <TextInput
                      value={val(r, "badge_label")}
                      onChange={(e) => edit(r, "badge_label", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Keywords"
                    help="Separate with commas. Shown as small tags on the card."
                  >
                    <TextInput
                      value={((draft[r.id]?.tags ?? r.tags) as string[]).join(", ")}
                      onChange={(e) =>
                        edit(
                          r,
                          "tags",
                          e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Description" help="The paragraph inside the card.">
                      <TextArea
                        value={val(r, "description")}
                        onChange={(e) => edit(r, "description", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--bp-line)] pt-4">
                  <Toggle
                    checked={r.visible}
                    onChange={async (v) => {
                      await patch("programs", r.id, { visible: v });
                      refresh();
                    }}
                    label="Shown on site"
                    help="Turn off to hide this programme without deleting it."
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!draft[r.id]}
                    onClick={() => save(r)}
                  >
                    Save programme
                  </Button>
                </div>
              </ItemCard>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Delete this programme?"
        confirmLabel="Delete programme"
        description={
          confirm ? (
            <>
              <strong>{confirm.name}</strong> will be removed from the website. This cannot be
              undone.
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

/* ── Projects ───────────────────────────────────────────────────────────── */

interface ProjectRow {
  id: string;
  title: string;
  domain: string;
  age_range: string;
  media_id: string | null;
  description: string | null;
  description_confirmed: boolean;
  featured: boolean;
  order: number;
  visible: boolean;
}

const PROJECT_DOMAINS: Record<string, { label: string; dot: string }> = {
  robotics: { label: "Robotics", dot: "#d9a441" },
  ai: { label: "Artificial Intelligence", dot: "#39c2d7" },
  space: { label: "Space Science", dot: "#7c83f0" },
};

export function ProjectsPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<ProjectRow>(
    "projects",
    "id, title, domain, age_range, media_id, description, description_confirmed, featured, order, visible",
  );
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [draft, setDraft] = useState<Partial<ProjectRow>>({});
  const [confirm, setConfirm] = useState<ProjectRow | null>(null);

  const mediaRows = rows
    .filter((r) => r.media_id)
    .map((r) => ({ id: r.media_id as string, storage_path: "", alt_text: r.title })) as MediaItem[];
  const [library, setLibrary] = useState<MediaItem[]>([]);
  useEffect(() => {
    supabase
      .from("media")
      .select("id, storage_path, alt_text, tag, width, height, created_at")
      .then(({ data }) => setLibrary((data as MediaItem[]) ?? []));
  }, []);
  const urls = useMediaUrls(library.length > 0 ? library : mediaRows);

  const missingPhotos = rows.filter((r) => !r.media_id).length;

  function open(r: ProjectRow) {
    setEditing(r);
    setDraft({});
  }

  const field = <K extends keyof ProjectRow>(k: K): ProjectRow[K] =>
    (draft[k] ?? editing?.[k] ?? "") as ProjectRow[K];
  const edit = (k: keyof ProjectRow, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    if (!editing) return;
    const { error } = await patch("projects", editing.id, draft);
    if (error) return toast(toSafeErrorMessage(error, "Could not save that project."), "error");
    setEditing(null);
    setDraft({});
    toast("Project saved.");
    refresh();
  }

  /** Only one project can be featured — setting a new one clears the previous. */
  async function setFeatured(r: ProjectRow, on: boolean) {
    if (on) {
      for (const other of rows.filter((x) => x.featured && x.id !== r.id)) {
        await patch("projects", other.id, { featured: false });
      }
    }
    const { error } = await patch("projects", r.id, { featured: on });
    if (error) return toast(toSafeErrorMessage(error, "Could not update that project."), "error");
    toast(on ? `“${r.title}” is now the featured project.` : "Featured project cleared.");
    refresh();
  }

  async function add() {
    const { error } = await supabase.from("projects").insert({
      title: "New project",
      domain: "robotics",
      age_range: "Ages 8–12",
      order: (rows[rows.length - 1]?.order ?? 0) + 1,
    });
    if (error) return toast(toSafeErrorMessage(error, "Could not add that project."), "error");
    toast("Project added.");
    refresh();
  }

  async function remove(r: ProjectRow) {
    const { error } = await verifyRowsAffected(supabase.from("projects").delete().eq("id", r.id));
    setConfirm(null);
    if (error) return toast(toSafeErrorMessage(error, "Could not delete that project."), "error");
    toast("Project deleted.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading projects…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Student projects"
        hint="Shown in the classroom strip on the Home page and in the build log on the Students page. Drag order controls the sequence visitors see."
        actions={
          <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={add}>
            Add project
          </Button>
        }
      >
        {missingPhotos > 0 && (
          <p className="mb-4 flex items-center gap-2 rounded-md border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)] px-3 py-2 text-[13px] text-[color:var(--bp-ink-2)]">
            <Camera className="size-3.5 shrink-0" aria-hidden />
            {missingPhotos} {missingPhotos === 1 ? "project still needs" : "projects still need"} a
            photograph. They show a plain coloured panel on the website until one is added.
          </p>
        )}

        {rows.length === 0 ? (
          <EmptyState
            title="No projects yet — add your first one"
            description="Projects show visitors what students actually build."
            action={
              <Button variant="primary" onClick={add}>
                Add project
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((r, i) => {
              const dom = PROJECT_DOMAINS[r.domain] ?? { label: r.domain, dot: "#888" };
              const thumb = r.media_id ? urls[r.media_id] : undefined;
              return (
                <li
                  key={r.id}
                  className="flex flex-col overflow-hidden rounded-lg border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)]"
                >
                  <div className="relative aspect-[16/10] w-full bg-[color:var(--bp-paper)]">
                    {thumb ? (
                      <img src={thumb} alt={r.title} className="size-full object-cover" />
                    ) : (
                      <div
                        className="flex size-full flex-col items-center justify-center gap-1.5"
                        style={{ background: `${dom.dot}18` }}
                      >
                        <Camera className="size-4 text-[color:var(--bp-muted)]" aria-hidden />
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
                          Photo needed
                        </span>
                      </div>
                    )}
                    {r.featured && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white">
                        <Star className="size-2.5 fill-current" aria-hidden /> Featured
                      </span>
                    )}
                    {!r.visible && (
                      <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white">
                        Hidden
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="font-display text-sm font-semibold text-[color:var(--bp-ink)]">
                      {r.title}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[color:var(--bp-ink-2)]">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: dom.dot }}
                        aria-hidden
                      />
                      {dom.label} · {r.age_range}
                    </p>
                    {!r.description_confirmed && (
                      <p className="mt-1.5 text-[11px] text-[color:var(--bp-muted)]">
                        Description not confirmed
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[color:var(--bp-line)] pt-3">
                      <Button size="sm" onClick={() => open(r)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          patch("projects", r.id, { visible: !r.visible }).then(refresh)
                        }
                      >
                        {r.visible ? "Hide" : "Show"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setFeatured(r, !r.featured)}>
                        {r.featured ? "Unfeature" : "Feature"}
                      </Button>
                      <span className="ml-auto flex items-center gap-1">
                        <IconButton
                          label="Move earlier"
                          disabled={i === 0}
                          onClick={() => swapOrder("projects", rows, i, i - 1, refresh)}
                        >
                          ↑
                        </IconButton>
                        <IconButton
                          label="Move later"
                          disabled={i === rows.length - 1}
                          onClick={() => swapOrder("projects", rows, i, i + 1, refresh)}
                        >
                          ↓
                        </IconButton>
                        <IconButton label="Delete project" onClick={() => setConfirm(r)}>
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
        title={editing ? `Edit ${editing.title}` : ""}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Project title" help="Shown under the picture.">
                <TextInput
                  value={field("title") as string}
                  onChange={(e) => edit("title", e.target.value)}
                />
              </Field>
              <Field label="Discipline" help="Sets the colour accent used on the card.">
                <SelectInput
                  value={field("domain") as string}
                  onChange={(e) => edit("domain", e.target.value)}
                >
                  <option value="robotics">Robotics</option>
                  <option value="ai">Artificial Intelligence</option>
                  <option value="space">Space Science</option>
                </SelectInput>
              </Field>
              <Field label="Age range" help="Shown as a small caption, e.g. Ages 8–12.">
                <TextInput
                  value={field("age_range") as string}
                  onChange={(e) => edit("age_range", e.target.value)}
                />
              </Field>
              <ImagePicker
                label="Photograph"
                help="Leave empty and the website shows a plain coloured panel instead of a broken picture."
                value={draft.media_id ?? editing.media_id ?? null}
                onChange={(id) => edit("media_id", id)}
              />
            </div>
            <Field label="Description" help="What the student builds, and what they learn from it.">
              <TextArea
                rows={5}
                value={(field("description") as string) ?? ""}
                onChange={(e) => edit("description", e.target.value)}
              />
            </Field>
            <div className="space-y-3 border-t border-[color:var(--bp-line)] pt-4">
              <Toggle
                checked={(draft.description_confirmed ?? editing.description_confirmed) as boolean}
                onChange={(v) => edit("description_confirmed", v)}
                label="Description confirmed"
                help="Leave this off and visitors see a small note saying the wording is not final yet. Turn it on once the wording is approved."
              />
              <Toggle
                checked={(draft.visible ?? editing.visible) as boolean}
                onChange={(v) => edit("visible", v)}
                label="Shown on site"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={save}>
                Save project
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Delete this project?"
        confirmLabel="Delete project"
        description={
          confirm ? (
            <>
              <strong>{confirm.title}</strong> will be removed from the website. This cannot be
              undone.
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

/* ── Partner schools ────────────────────────────────────────────────────── */

interface PartnerRow {
  id: string;
  name: string;
  blurb: string | null;
  logo_media_id: string | null;
  order: number;
  visible: boolean;
}

export function PartnerSchoolsPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<PartnerRow>(
    "partners_schools",
    "id, name, blurb, logo_media_id, order, visible",
  );
  const [draft, setDraft] = useState<Record<string, Partial<PartnerRow>>>({});
  const [confirm, setConfirm] = useState<PartnerRow | null>(null);
  const dragProps = useDragReorder((f, t) => swapOrder("partners_schools", rows, f, t, refresh));

  const val = (r: PartnerRow, k: keyof PartnerRow) => (draft[r.id]?.[k] ?? r[k] ?? "") as never;
  const edit = (r: PartnerRow, k: keyof PartnerRow, v: unknown) =>
    setDraft((d) => ({ ...d, [r.id]: { ...d[r.id], [k]: v } }));

  async function save(r: PartnerRow) {
    const { error } = await patch("partners_schools", r.id, draft[r.id] ?? {});
    if (error)
      return toast(toSafeErrorMessage(error, "Could not save that partner school."), "error");
    setDraft((d) => {
      const n = { ...d };
      delete n[r.id];
      return n;
    });
    toast("Partner school saved.");
    refresh();
  }

  async function add() {
    const { error } = await supabase.from("partners_schools").insert({
      name: "New partner school",
      order: (rows[rows.length - 1]?.order ?? 0) + 1,
    });
    if (error)
      return toast(toSafeErrorMessage(error, "Could not add that partner school."), "error");
    refresh();
  }

  async function remove(r: PartnerRow) {
    const { error } = await verifyRowsAffected(
      supabase.from("partners_schools").delete().eq("id", r.id),
    );
    setConfirm(null);
    if (error)
      return toast(toSafeErrorMessage(error, "Could not delete that partner school."), "error");
    toast("Partner school deleted.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading partner schools…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Partner schools"
        hint="The school strip shown on the Home and Partners pages."
        actions={
          <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={add}>
            Add partner school
          </Button>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No partner schools yet — add your first one"
            action={
              <Button variant="primary" onClick={add}>
                Add partner school
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((r, i) => (
              <ItemCard
                key={r.id}
                index={i}
                count={rows.length}
                title={r.name}
                dragProps={dragProps(i)}
                onMove={(f, t) => swapOrder("partners_schools", rows, f, t, refresh)}
                onRemove={() => setConfirm(r)}
                removeLabel="Delete partner school"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="School name" help="Shown in the partner strip.">
                    <TextInput
                      value={val(r, "name")}
                      onChange={(e) => edit(r, "name", e.target.value)}
                    />
                  </Field>
                  <ImagePicker
                    label="Logo"
                    help="Optional. Shown instead of the name when supplied."
                    value={draft[r.id]?.logo_media_id ?? r.logo_media_id ?? null}
                    onChange={(id) => edit(r, "logo_media_id", id)}
                  />
                  <div className="md:col-span-2">
                    <Field
                      label="Short note"
                      help="A line about the partnership, shown under the name."
                    >
                      <TextArea
                        value={val(r, "blurb")}
                        onChange={(e) => edit(r, "blurb", e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--bp-line)] pt-4">
                  <Toggle
                    checked={r.visible}
                    onChange={async (v) => {
                      await patch("partners_schools", r.id, { visible: v });
                      refresh();
                    }}
                    label="Shown on site"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!draft[r.id]}
                    onClick={() => save(r)}
                  >
                    Save partner school
                  </Button>
                </div>
              </ItemCard>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Delete this partner school?"
        confirmLabel="Delete"
        description={
          confirm ? (
            <>
              <strong>{confirm.name}</strong> will be removed from the website.
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

/* ── Testimonials ───────────────────────────────────────────────────────── */

interface TestimonialRow {
  id: string;
  quote: string;
  attribution: string | null;
  is_placeholder: boolean;
  visible: boolean;
  order: number;
}

export function TestimonialsPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<TestimonialRow>(
    "testimonials",
    "id, quote, attribution, is_placeholder, visible, order",
  );
  const [draft, setDraft] = useState<Record<string, Partial<TestimonialRow>>>({});
  const [confirm, setConfirm] = useState<TestimonialRow | null>(null);
  const dragProps = useDragReorder((f, t) => swapOrder("testimonials", rows, f, t, refresh));

  const val = (r: TestimonialRow, k: keyof TestimonialRow) =>
    (draft[r.id]?.[k] ?? r[k] ?? "") as never;
  const edit = (r: TestimonialRow, k: keyof TestimonialRow, v: unknown) =>
    setDraft((d) => ({ ...d, [r.id]: { ...d[r.id], [k]: v } }));

  async function save(r: TestimonialRow) {
    const { error } = await patch("testimonials", r.id, draft[r.id] ?? {});
    if (error) return toast(toSafeErrorMessage(error, "Could not save that testimonial."), "error");
    setDraft((d) => {
      const n = { ...d };
      delete n[r.id];
      return n;
    });
    toast("Testimonial saved.");
    refresh();
  }

  async function add() {
    const { error } = await supabase.from("testimonials").insert({
      quote: "New quote",
      order: (rows[rows.length - 1]?.order ?? 0) + 1,
    });
    if (error) return toast(toSafeErrorMessage(error, "Could not add that testimonial."), "error");
    refresh();
  }

  async function remove(r: TestimonialRow) {
    const { error } = await verifyRowsAffected(
      supabase.from("testimonials").delete().eq("id", r.id),
    );
    setConfirm(null);
    if (error)
      return toast(toSafeErrorMessage(error, "Could not delete that testimonial."), "error");
    toast("Testimonial deleted.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading testimonials…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Testimonials"
        hint="Quotes shown alongside the partner schools."
        actions={
          <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={add}>
            Add testimonial
          </Button>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No testimonials yet — add your first one"
            action={
              <Button variant="primary" onClick={add}>
                Add testimonial
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((r, i) => (
              <ItemCard
                key={r.id}
                index={i}
                count={rows.length}
                title={r.attribution || "Quote"}
                dragProps={dragProps(i)}
                onMove={(f, t) => swapOrder("testimonials", rows, f, t, refresh)}
                onRemove={() => setConfirm(r)}
                removeLabel="Delete testimonial"
              >
                <div className="grid gap-4">
                  <Field label="Quote" help="The words shown between quotation marks.">
                    <TextArea
                      value={val(r, "quote")}
                      onChange={(e) => edit(r, "quote", e.target.value)}
                    />
                  </Field>
                  <Field label="Who said it" help="Name and role, shown beneath the quote.">
                    <TextInput
                      value={val(r, "attribution")}
                      onChange={(e) => edit(r, "attribution", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t border-[color:var(--bp-line)] pt-4">
                  <div className="space-y-3">
                    <Toggle
                      checked={r.is_placeholder}
                      onChange={async (v) => {
                        await patch("testimonials", r.id, { is_placeholder: v });
                        refresh();
                      }}
                      label="Mark as placeholder"
                      help="While this is on, a note appears on the website telling visitors this quote isn't final yet. Turn it off once you have a real quote."
                    />
                    <Toggle
                      checked={r.visible}
                      onChange={async (v) => {
                        await patch("testimonials", r.id, { visible: v });
                        refresh();
                      }}
                      label="Shown on site"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!draft[r.id]}
                    onClick={() => save(r)}
                  >
                    Save testimonial
                  </Button>
                </div>
              </ItemCard>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Delete this testimonial?"
        confirmLabel="Delete"
        description="The quote will be removed from the website. This cannot be undone."
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove(confirm)}
      />
    </div>
  );
}

/* ── Faculty details ────────────────────────────────────────────────────── */

interface ClaimRow {
  id: string;
  claim_group: string;
  claim_key: string;
  label: string;
  value: string;
  description: string | null;
  is_placeholder: boolean;
  order: number;
}

const CLAIM_GROUP_LABELS: Record<string, string> = {
  timeline: "Instructor journey",
  dossier: "Faculty dossier figures",
  radial: "Central dial",
  metrics: "Headline metrics",
};

export function FacultyDetailsPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<ClaimRow>(
    "faculty_claims",
    "id, claim_group, claim_key, label, value, description, is_placeholder, order",
  );
  const [draft, setDraft] = useState<Record<string, Partial<ClaimRow>>>({});

  const val = (r: ClaimRow, k: keyof ClaimRow) => (draft[r.id]?.[k] ?? r[k] ?? "") as never;
  const edit = (r: ClaimRow, k: keyof ClaimRow, v: unknown) =>
    setDraft((d) => ({ ...d, [r.id]: { ...d[r.id], [k]: v } }));

  async function save(r: ClaimRow) {
    const { error } = await patch("faculty_claims", r.id, draft[r.id] ?? {});
    if (error) return toast(toSafeErrorMessage(error, "Could not save that detail."), "error");
    setDraft((d) => {
      const n = { ...d };
      delete n[r.id];
      return n;
    });
    toast("Faculty detail saved.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading faculty details…" />;

  const groups = [...new Set(rows.map((r) => r.claim_group))];

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      {rows.length === 0 && (
        <Panel>
          <EmptyState
            title="No faculty details yet"
            description="Figures added here appear in the faculty block on the Home page."
          />
        </Panel>
      )}
      {groups.map((g) => (
        <Panel
          key={g}
          title={CLAIM_GROUP_LABELS[g] ?? g.replace(/_/g, " ")}
          hint="Shown in the faculty credibility block on the Home page."
        >
          <ul className="space-y-4">
            {rows
              .filter((r) => r.claim_group === g)
              .map((r, i, arr) => (
                <ItemCard key={r.id} index={i} count={arr.length} title={r.label || "Detail"}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Caption" help="The wording shown next to the figure.">
                      <TextInput
                        value={val(r, "label")}
                        onChange={(e) => edit(r, "label", e.target.value)}
                      />
                    </Field>
                    <Field label="Figure" help="The number or short phrase shown on the live page.">
                      <TextInput
                        value={val(r, "value")}
                        onChange={(e) => edit(r, "value", e.target.value)}
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field
                        label="Supporting sentence"
                        help="Optional detail shown beneath the figure."
                      >
                        <TextArea
                          value={val(r, "description")}
                          onChange={(e) => edit(r, "description", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-start justify-between gap-4 border-t border-[color:var(--bp-line)] pt-4">
                    <Toggle
                      checked={r.is_placeholder}
                      onChange={async (v) => {
                        await patch("faculty_claims", r.id, { is_placeholder: v });
                        refresh();
                      }}
                      label="Mark as placeholder"
                      help="While this is on, a note appears on the website telling visitors these figures aren't final yet. Turn it off once you've entered real data."
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!draft[r.id]}
                      onClick={() => save(r)}
                    >
                      Save detail
                    </Button>
                  </div>
                </ItemCard>
              ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}

/* ── Navigation & footer ────────────────────────────────────────────────── */

interface NavRow {
  id: string;
  label: string;
  target: string;
  location: "nav" | "footer";
  footer_column: string | null;
  order: number;
  visible: boolean;
}

export function NavigationPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<NavRow>(
    "nav_items",
    "id, label, target, location, footer_column, order, visible",
  );
  const [draft, setDraft] = useState<Record<string, Partial<NavRow>>>({});
  const [confirm, setConfirm] = useState<NavRow | null>(null);

  const val = (r: NavRow, k: keyof NavRow) => (draft[r.id]?.[k] ?? r[k] ?? "") as never;
  const edit = (r: NavRow, k: keyof NavRow, v: unknown) =>
    setDraft((d) => ({ ...d, [r.id]: { ...d[r.id], [k]: v } }));

  async function save(r: NavRow) {
    const { error } = await patch("nav_items", r.id, draft[r.id] ?? {});
    if (error) return toast(toSafeErrorMessage(error, "Could not save that link."), "error");
    setDraft((d) => {
      const n = { ...d };
      delete n[r.id];
      return n;
    });
    toast("Link saved.");
    refresh();
  }

  async function add(location: "nav" | "footer") {
    const siblings = rows.filter((r) => r.location === location);
    const { error } = await supabase.from("nav_items").insert({
      label: "New link",
      target: "/",
      location,
      order: (siblings[siblings.length - 1]?.order ?? 0) + 1,
    });
    if (error) return toast(toSafeErrorMessage(error, "Could not add that link."), "error");
    refresh();
  }

  async function remove(r: NavRow) {
    const { error } = await verifyRowsAffected(supabase.from("nav_items").delete().eq("id", r.id));
    setConfirm(null);
    if (error) return toast(toSafeErrorMessage(error, "Could not delete that link."), "error");
    toast("Link deleted.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading links…" />;

  const sections: { id: "nav" | "footer"; title: string; hint: string }[] = [
    { id: "nav", title: "Top menu", hint: "The links across the top of every page." },
    {
      id: "footer",
      title: "Footer links",
      hint: "Grouped into columns at the bottom of every page.",
    },
  ];

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      {sections.map((s) => {
        const list = rows.filter((r) => r.location === s.id);
        return (
          <Panel
            key={s.id}
            title={s.title}
            hint={s.hint}
            actions={
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="size-3.5" />}
                onClick={() => add(s.id)}
              >
                Add link
              </Button>
            }
          >
            {list.length === 0 ? (
              <EmptyState
                title="No links here yet"
                description="Add your first link to show it on the site."
              />
            ) : (
              <ul className="space-y-4">
                {list.map((r, i) => (
                  <ItemCard
                    key={r.id}
                    index={i}
                    count={list.length}
                    title={r.label}
                    onMove={(f, t) => swapOrder("nav_items", list, f, t, refresh)}
                    onRemove={() => setConfirm(r)}
                    removeLabel="Delete link"
                  >
                    <div className="grid gap-4 md:grid-cols-3">
                      <Field label="Link wording" help="What visitors read.">
                        <TextInput
                          value={val(r, "label")}
                          onChange={(e) => edit(r, "label", e.target.value)}
                        />
                      </Field>
                      <Field
                        label="Goes to"
                        help="A page address such as /programs, or a full web address."
                      >
                        <TextInput
                          value={val(r, "target")}
                          onChange={(e) => edit(r, "target", e.target.value)}
                        />
                      </Field>
                      {s.id === "footer" && (
                        <Field
                          label="Footer column"
                          help="Links sharing a column heading appear together."
                        >
                          <TextInput
                            value={val(r, "footer_column")}
                            placeholder="Explore"
                            onChange={(e) => edit(r, "footer_column", e.target.value)}
                          />
                        </Field>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--bp-line)] pt-4">
                      <Toggle
                        checked={r.visible}
                        onChange={async (v) => {
                          await patch("nav_items", r.id, { visible: v });
                          refresh();
                        }}
                        label="Shown on site"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!draft[r.id]}
                        onClick={() => save(r)}
                      >
                        Save link
                      </Button>
                    </div>
                  </ItemCard>
                ))}
              </ul>
            )}
          </Panel>
        );
      })}

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Delete this link?"
        confirmLabel="Delete link"
        description={
          confirm ? (
            <>
              <strong>{confirm.label}</strong> will be removed from the website.
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

/* ── Not-yet-available collections ──────────────────────────────────────── */

export function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <Panel>
      <EmptyState title={title} description={description} />
    </Panel>
  );
}

/* ── Camp registration window ───────────────────────────────────────────── */

interface CampWindowRow {
  id: string;
  is_open: boolean;
  registration_mode: "built_in" | "external" | "closed";
  capacity: number | null;
  camp_name: string;
  dates_label: string;
  venue: string;
  age_tracks: string;
  register_label: string;
  register_url: string;
  note: string;
  show_closed_strip: boolean;
  closed_message: string;
  closed_target: string;
}

const CAMP_FIELDS: { key: keyof CampWindowRow; label: string; help: string; long?: boolean }[] = [
  {
    key: "camp_name",
    label: "Camp name",
    help: "Shown as the banner heading, e.g. Summer Boot Camp 2026.",
  },
  {
    key: "dates_label",
    label: "Dates",
    help: "Written exactly as you want it to read, e.g. June – July 2026.",
  },
  { key: "venue", label: "Venue", help: "Where the camp takes place." },
  {
    key: "age_tracks",
    label: "Age tracks",
    help: "The age groups on offer, e.g. Ages 5–7 · Ages 8–12 · Ages 13–17.",
  },
  { key: "register_label", label: "Registration button label", help: "The wording on the button." },
  {
    key: "register_url",
    label: "External registration link",
    help: "Only used when registrations are handled on another website.",
  },
  {
    key: "note",
    label: "Small note",
    help: "An optional line under the details, e.g. about limited seats.",
    long: true,
  },
];

export function CampWindowPanel() {
  const toast = useToast();
  const [row, setRow] = useState<CampWindowRow | null>(null);
  const [draft, setDraft] = useState<CampWindowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("camp_window" as any) as any)
      .select(
        "id, is_open, registration_mode, capacity, camp_name, dates_label, venue, age_tracks, register_label, register_url, note, show_closed_strip, closed_message, closed_target",
      )
      .limit(1)
      .maybeSingle();
    setErr(error ? toSafeErrorMessage(error, "Could not load the camp window settings.") : null);
    setRow((data as CampWindowRow) ?? null);
    setDraft((data as CampWindowRow) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) return <LoadingState label="Loading camp banner…" />;
  if (!draft || !row)
    return (
      <EmptyState
        title="No camp banner set up yet"
        description="The camp registration banner has not been created for this website."
      />
    );

  const dirty = JSON.stringify(draft) !== JSON.stringify(row);

  async function save() {
    if (!draft) return;
    setSaving(true);
    const { id, ...values } = draft;

    const { error } = await verifyRowsAffected(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("camp_window" as any) as any).update(values).eq("id", id),
    );
    setSaving(false);
    if (error)
      return toast(toSafeErrorMessage(error, "Could not save the camp window settings."), "error");
    toast("Camp banner saved.");
    refresh();
  }

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Camp registration banner"
        hint="This banner sits directly under the Programs page headline."
        actions={
          <Button variant="primary" disabled={!dirty || saving} onClick={save}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        }
      >
        <div className="space-y-6">
          <Toggle
            checked={draft.is_open}
            onChange={(v) => setDraft({ ...draft, is_open: v })}
            label="Camp is open"
            help="This single switch controls BOTH the banner on the Programs page AND the announcement bar shown at the top of every page on the website. When it is off, neither is shown."
          />

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="How people register"
              help="Choose whether registrations are taken on this website, on another website, or not yet."
            >
              <SelectInput
                value={draft.registration_mode}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    registration_mode: e.target.value as CampWindowRow["registration_mode"],
                  })
                }
              >
                <option value="built_in">On this website (registration form)</option>
                <option value="external">On another website (link)</option>
                <option value="closed">Not yet — show "Details soon"</option>
              </SelectInput>
            </Field>
            <Field
              label="Places available"
              help="Leave empty for no limit. Once this number of places is taken, the form keeps accepting people onto a waitlist."
            >
              <TextInput
                type="number"
                min={1}
                value={draft.capacity ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    capacity: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {CAMP_FIELDS.map((f) => (
              <div key={f.key} className={f.long ? "md:col-span-2" : ""}>
                <Field label={f.label} help={f.help}>
                  {f.long ? (
                    <TextArea
                      value={String(draft[f.key] ?? "")}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    />
                  ) : (
                    <TextInput
                      value={String(draft[f.key] ?? "")}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>

          <div className="space-y-5 border-t border-[color:var(--bp-line)] pt-6">
            <Toggle
              checked={draft.show_closed_strip}
              onChange={(v) => setDraft({ ...draft, show_closed_strip: v })}
              label="Show a quiet notice while registration is closed"
              help="A single line inviting visitors to get in touch, shown instead of the full banner."
            />
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Closed notice wording" help="Shown while registration is closed.">
                <TextInput
                  value={draft.closed_message}
                  onChange={(e) => setDraft({ ...draft, closed_message: e.target.value })}
                />
              </Field>
              <Field
                label="Closed notice goes to"
                help="Where visitors land when they press the notice."
              >
                <TextInput
                  value={draft.closed_target}
                  onChange={(e) => setDraft({ ...draft, closed_target: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ── Affiliations ───────────────────────────────────────────────────────── */

type AffiliationRow = {
  id: string;
  name: string;
  scope: "national" | "international";
  note: string | null;
  logo_media_id: string | null;
  order: number;
  visible: boolean;
};

export function AffiliationsPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<AffiliationRow>(
    "affiliations",
    "id, name, scope, note, logo_media_id, order, visible",
  );
  const [draft, setDraft] = useState<Record<string, Partial<AffiliationRow>>>({});
  const [confirm, setConfirm] = useState<AffiliationRow | null>(null);
  const dragProps = useDragReorder((f, t) => swapOrder("affiliations", rows, f, t, refresh));

  const val = (r: AffiliationRow, k: keyof AffiliationRow) =>
    (draft[r.id]?.[k] ?? r[k] ?? "") as never;
  const edit = (r: AffiliationRow, k: keyof AffiliationRow, v: unknown) =>
    setDraft((d) => ({ ...d, [r.id]: { ...d[r.id], [k]: v } }));

  async function save(r: AffiliationRow) {
    const { error } = await patch("affiliations", r.id, draft[r.id] ?? {});
    if (error) return toast(toSafeErrorMessage(error, "Could not save that affiliation."), "error");
    setDraft((d) => {
      const n = { ...d };
      delete n[r.id];
      return n;
    });
    toast("Affiliation saved.");
    refresh();
  }

  async function add() {
    const { error } = await supabase.from("affiliations").insert({
      name: "New organisation",
      order: (rows[rows.length - 1]?.order ?? 0) + 1,
    });
    if (error) return toast(toSafeErrorMessage(error, "Could not add that affiliation."), "error");
    refresh();
  }

  async function remove(r: AffiliationRow) {
    const { error } = await verifyRowsAffected(
      supabase.from("affiliations").delete().eq("id", r.id),
    );
    setConfirm(null);
    if (error)
      return toast(toSafeErrorMessage(error, "Could not delete that affiliation."), "error");
    toast("Affiliation deleted.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading affiliations…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Affiliations"
        hint="The national and international organisations listed on the About and Partners pages."
        actions={
          <Button variant="primary" icon={<Plus className="size-3.5" />} onClick={add}>
            Add organisation
          </Button>
        }
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No affiliations yet — add your first one"
            action={
              <Button variant="primary" onClick={add}>
                Add organisation
              </Button>
            }
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((r, i) => (
              <ItemCard
                key={r.id}
                index={i}
                count={rows.length}
                title={r.name}
                dragProps={dragProps(i)}
                onMove={(f, t) => swapOrder("affiliations", rows, f, t, refresh)}
                onRemove={() => setConfirm(r)}
                removeLabel="Delete organisation"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Organisation name" help="Shown exactly as typed on the live page.">
                    <TextInput
                      value={val(r, "name")}
                      onChange={(e) => edit(r, "name", e.target.value)}
                    />
                  </Field>
                  <Field label="Column" help="Which list this organisation appears in.">
                    <SelectInput
                      value={(draft[r.id]?.scope ?? r.scope) as string}
                      onChange={(e) => edit(r, "scope", e.target.value)}
                    >
                      <option value="national">National</option>
                      <option value="international">International</option>
                    </SelectInput>
                  </Field>
                  <ImagePicker
                    label="Logo"
                    help="Optional. Kept for future use in the partner strip."
                    value={draft[r.id]?.logo_media_id ?? r.logo_media_id ?? null}
                    onChange={(id) => edit(r, "logo_media_id", id)}
                  />
                  <Field
                    label="Short note"
                    help="Optional line shown beneath the organisation name."
                  >
                    <TextArea
                      value={val(r, "note")}
                      onChange={(e) => edit(r, "note", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--bp-line)] pt-4">
                  <Toggle
                    checked={r.visible}
                    onChange={async (v) => {
                      await patch("affiliations", r.id, { visible: v });
                      refresh();
                    }}
                    label="Shown on site"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!draft[r.id]}
                    onClick={() => save(r)}
                  >
                    Save organisation
                  </Button>
                </div>
              </ItemCard>
            ))}
          </ul>
        )}
      </Panel>

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Delete this organisation?"
        confirmLabel="Delete"
        description={
          confirm ? (
            <>
              <strong>{confirm.name}</strong> will be removed from the website.
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

/* ── People (leadership & team) ─────────────────────────────────────────── */

type Tier = "leadership" | "team";

type PersonRow = {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  bio_confirmed: boolean;
  media_id: string | null;
  tier: Tier;
  order: number;
  visible: boolean;
};

const TIER_LABEL: Record<Tier, string> = {
  leadership: "Leadership",
  team: "The Team",
};

function personInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LeadershipPanel() {
  const toast = useToast();
  const { rows, loading, err, refresh } = useCollection<PersonRow>(
    "leadership",
    "id, name, title, bio, bio_confirmed, media_id, tier, order, visible",
  );
  const [media, setMedia] = useState<MediaItem[]>([]);
  const urls = useMediaUrls(media);
  const [editing, setEditing] = useState<PersonRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<PersonRow | null>(null);

  useEffect(() => {
    supabase
      .from("media")
      .select("id, storage_path, alt_text, tag, width, height, created_at")
      .then(({ data }) => setMedia((data as MediaItem[]) ?? []));
  }, []);

  const byTier = (t: Tier) =>
    rows
      .filter((r) => (r.tier ?? "leadership") === t)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  async function move(t: Tier, index: number, dir: -1 | 1) {
    const group = byTier(t);
    const a = group[index];
    const b = group[index + dir];
    if (!a || !b) return;
    await patch("leadership", a.id, { order: b.order });
    await patch("leadership", b.id, { order: a.order });
    refresh();
  }

  async function setTier(r: PersonRow, tier: Tier) {
    const { error } = await patch("leadership", r.id, { tier });
    if (error)
      return toast(toSafeErrorMessage(error, "Could not update that person's tier."), "error");
    toast(`${r.name} moved to ${TIER_LABEL[tier]}.`);
    refresh();
  }

  async function remove(r: PersonRow) {
    const { error } = await verifyRowsAffected(supabase.from("leadership").delete().eq("id", r.id));
    setConfirm(null);
    if (error) return toast(toSafeErrorMessage(error, "Could not remove that person."), "error");
    toast("Person removed.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading people…" />;

  const nextOrder = (rows[rows.length - 1]?.order ?? 0) + 1;

  function tierSection(t: Tier, hint: string) {
    const group = byTier(t);
    return (
      <Panel
        key={t}
        title={TIER_LABEL[t]}
        hint={hint}
        actions={
          <Button
            variant="primary"
            icon={<Plus className="size-3.5" />}
            onClick={() => setAdding(true)}
          >
            Add person
          </Button>
        }
      >
        {group.length === 0 ? (
          <EmptyState
            title={`Nobody in ${TIER_LABEL[t]} yet`}
            action={
              <Button variant="primary" onClick={() => setAdding(true)}>
                Add person
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.map((r, i) => (
              <li
                key={r.id}
                className="rounded-lg border border-[color:var(--bp-line)] bg-[color:var(--bp-paper)] p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-full border border-[color:var(--bp-line-strong)]">
                    {r.media_id && urls[r.media_id] ? (
                      <img src={urls[r.media_id]} alt={r.name} className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center bg-[color:var(--bp-line)]/40 text-sm font-semibold text-[color:var(--bp-muted)]">
                        {personInitials(r.name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.name}</p>
                    <p className="truncate text-xs text-[color:var(--bp-muted)]">{r.title}</p>
                    {!r.visible && (
                      <p className="mt-1 text-[10px] uppercase tracking-widest text-[color:var(--bp-muted)]">
                        Hidden
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <Field label="Shown in">
                    <SelectInput
                      value={r.tier ?? "leadership"}
                      onChange={(e) => setTier(r, e.target.value as Tier)}
                    >
                      <option value="leadership">Leadership</option>
                      <option value="team">The Team</option>
                    </SelectInput>
                  </Field>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--bp-line)] pt-3">
                  <div className="flex items-center gap-1">
                    <IconButton
                      label="Move earlier"
                      disabled={i === 0}
                      onClick={() => move(t, i, -1)}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label="Move later"
                      disabled={i === group.length - 1}
                      onClick={() => move(t, i, 1)}
                    >
                      ↓
                    </IconButton>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        await patch("leadership", r.id, { visible: !r.visible });
                        refresh();
                      }}
                    >
                      {r.visible ? "Hide" : "Show"}
                    </Button>
                    <IconButton label="Remove person" onClick={() => setConfirm(r)}>
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      {tierSection(
        "leadership",
        "The prominent cards at the top of the People block on the About page.",
      )}
      {tierSection(
        "team",
        "The compact grid underneath. Biographies appear when a visitor hovers or taps a card.",
      )}

      <PersonDialog
        open={adding}
        title="Add a person"
        person={{
          id: "",
          name: "",
          title: "",
          bio: "",
          bio_confirmed: false,
          media_id: null,
          tier: "team",
          order: nextOrder,
          visible: true,
        }}
        onClose={() => setAdding(false)}
        onSave={async (values) => {
          const { error } = await supabase
            .from("leadership")
            .insert({ ...values, order: nextOrder });
          if (error) return toast(toSafeErrorMessage(error, "Could not add that person."), "error");
          setAdding(false);
          toast("Person added.");
          refresh();
        }}
      />

      <PersonDialog
        open={editing !== null}
        title="Edit person"
        person={editing}
        onClose={() => setEditing(null)}
        onSave={async (values) => {
          if (!editing) return;
          const { error } = await patch("leadership", editing.id, values);
          if (error)
            return toast(toSafeErrorMessage(error, "Could not save that person."), "error");
          setEditing(null);
          toast("Person saved.");
          refresh();
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        danger
        title="Remove this person?"
        confirmLabel="Remove"
        description={
          confirm ? (
            <>
              <strong>{confirm.name}</strong> will no longer appear on the About page.
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

function PersonDialog({
  open,
  title,
  person,
  onClose,
  onSave,
}: {
  open: boolean;
  title: string;
  person: PersonRow | null;
  onClose: () => void;
  onSave: (values: {
    name: string;
    title: string;
    bio: string | null;
    bio_confirmed: boolean;
    media_id: string | null;
    tier: Tier;
    visible: boolean;
  }) => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    title: "",
    bio: "",
    bio_confirmed: false,
    media_id: null as string | null,
    tier: "team" as Tier,
    visible: true,
  });

  useEffect(() => {
    if (!open || !person) return;
    setForm({
      name: person.name,
      title: person.title,
      bio: person.bio ?? "",
      bio_confirmed: person.bio_confirmed,
      media_id: person.media_id,
      tier: (person.tier ?? "leadership") as Tier,
      visible: person.visible,
    });
  }, [open, person]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} title={title} onClose={onClose} width={640}>
      <div className="space-y-4">
        <Field label="Full name">
          <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Role or title" help="Shown under the name, e.g. Lead Robotics Instructor.">
          <TextInput value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Shown in" help="Leadership cards are larger and always show the biography.">
          <SelectInput value={form.tier} onChange={(e) => set("tier", e.target.value as Tier)}>
            <option value="leadership">Leadership</option>
            <option value="team">The Team</option>
          </SelectInput>
        </Field>
        <ImagePicker
          label="Photograph"
          help="Optional. Until one is added, a lettered badge is shown. Set a focal point in the Media Library so the face stays centred."
          value={form.media_id}
          onChange={(id) => set("media_id", id)}
        />
        <Field label="Short biography" help="Only published once you confirm it below.">
          <TextArea rows={5} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-6">
          <Toggle
            checked={form.bio_confirmed}
            onChange={(v) => set("bio_confirmed", v)}
            label="Biography confirmed"
          />
          <Toggle
            checked={form.visible}
            onChange={(v) => set("visible", v)}
            label="Shown on site"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-[color:var(--bp-line)] pt-4">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!form.name.trim() || !form.title.trim()}
            onClick={() =>
              onSave({
                name: form.name.trim(),
                title: form.title.trim(),
                bio: form.bio.trim() ? form.bio.trim() : null,
                bio_confirmed: form.bio_confirmed,
                media_id: form.media_id,
                tier: form.tier,
                visible: form.visible,
              })
            }
          >
            Save person
          </Button>
        </div>
      </div>
    </Modal>
  );
}
