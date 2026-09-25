import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
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
  useUnsavedGuard,
} from "@/components/dashboard/ui";
import { ImagePicker } from "./MediaLibrary";
import { PageSettingsPanel } from "./PagesOverview";
import {
  LIST_HELP,
  LIST_ITEM_NOUN,
  fieldMeta,
  humanize,
  inferKind,
  pageLabel,
  pagePath,
  sectionLabel,
  sectionPreview,
  SECTION_DESCRIPTIONS,
} from "@/lib/cms-schema";

interface SectionRow {
  id: string;
  page_slug: string;
  section_key: string;
  order: number;
  mode: string;
  visible: boolean;
  content: Record<string, unknown>;
}

interface PageOption {
  slug: string;
  title: string;
}

/* ── Page → sections list ───────────────────────────────────────────────── */

export function PageSectionsView({ slug }: { slug: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [pages, setPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SectionRow | null>(null);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("page_sections")
      .select("id, page_slug, section_key, order, mode, visible, content")
      .eq("page_slug", slug)
      .order("order")
      .order("id");
    if (error) setErr(toSafeErrorMessage(error, "Could not load sections."));
    setRows(
      ((data ?? []) as unknown as SectionRow[]).map((r) => ({
        ...r,
        content: (r.content ?? {}) as Record<string, unknown>,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    setEditingId(null);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    supabase
      .from("pages")
      .select("slug, title")
      .order("order")
      .order("slug")
      .then(({ data }) => setPages((data as PageOption[]) ?? []));
  }, []);

  async function addSection(name: string) {
    const key = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (!key) return toast("Please enter a name.", "error");
    const { error } = await supabase.from("page_sections").insert({
      page_slug: slug,
      section_key: key,
      order: (rows[rows.length - 1]?.order ?? 0) + 1,
      content: { headline: name.trim() },
    });
    if (error) return toast(toSafeErrorMessage(error, "Could not add that section."), "error");
    setAddOpen(false);
    toast(`"${name.trim()}" added.`);
    refresh();
  }

  async function doDelete(r: SectionRow) {
    const { error } = await verifyRowsAffected(
      supabase.from("page_sections").delete().eq("id", r.id),
    );
    setConfirmDelete(null);
    if (error) return toast(toSafeErrorMessage(error, "Could not delete that section."), "error");
    toast("Section deleted.");
    refresh();
  }

  const editing = rows.find((r) => r.id === editingId) ?? null;

  if (editing) {
    return (
      <SectionForm
        section={editing}
        pages={pages}
        onBack={() => setEditingId(null)}
        onSaved={() => {
          refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <PageSettingsPanel slug={slug} />
      <Panel
        title={`${pageLabel(slug)} — sections`}
        hint="Section order and visibility on this page are fixed in code, not by this list — reordering and hiding are disabled below."
        actions={
          <>
            <a
              href={pagePath(slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-4 py-2 text-sm text-[color:var(--bp-ink)] transition hover:border-[color:var(--bp-indigo)]"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              View live page
            </a>
            <Button
              variant="primary"
              icon={<Plus className="size-3.5" />}
              onClick={() => setAddOpen(true)}
            >
              Add section
            </Button>
          </>
        }
      >
        {loading ? (
          <LoadingState label="Loading sections…" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No sections yet"
            description={`The ${pageLabel(slug)} page has no content blocks. Add your first one to get started.`}
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                Add section
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((r, i) => {
              const theme = (r.content.theme as string) === "light" ? "light" : "dark";
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] p-4"
                >
                  <div className="min-w-[200px] flex-1">
                    <p className="font-display text-sm font-semibold text-[color:var(--bp-ink)]">
                      {sectionLabel(r.section_key)}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[color:var(--bp-ink-2)]">
                      {sectionPreview(r.content)}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--bp-line-strong)] px-2.5 py-1 text-[10px] uppercase tracking-widest text-[color:var(--bp-muted)]"
                    title="Background style of this section on the live page"
                  >
                    <span
                      className={
                        "inline-block size-2 rounded-full " +
                        (theme === "light" ? "bg-white" : "bg-[#0b0b1e] ring-1 ring-white/30")
                      }
                    />
                    {theme === "light" ? "Light" : "Dark"}
                  </span>
                  <Toggle
                    checked={r.visible}
                    onChange={() => {}}
                    disabled
                    label="Shown on site"
                    help="Hiding is disabled — this page always renders every section, regardless of this flag."
                  />
                  <div className="flex items-center gap-1.5">
                    <IconButton label="Reordering is disabled — order is fixed in code" disabled>
                      ↑
                    </IconButton>
                    <IconButton label="Reordering is disabled — order is fixed in code" disabled>
                      ↓
                    </IconButton>
                    <Button size="sm" onClick={() => setEditingId(r.id)}>
                      Edit
                    </Button>
                    <IconButton label="Delete section" onClick={() => setConfirmDelete(r)}>
                      <Trash2 className="size-4" aria-hidden />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <AddSectionDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={addSection} />

      <ConfirmDialog
        open={confirmDelete !== null}
        danger
        title="Delete this section?"
        confirmLabel="Delete section"
        description={
          confirmDelete ? (
            <>
              <strong>{sectionLabel(confirmDelete.section_key)}</strong> and all of its wording will
              be removed from the {pageLabel(slug)} page. This cannot be undone.
            </>
          ) : (
            ""
          )
        }
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
      />
    </div>
  );
}

function AddSectionDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName("");
  }, [open]);
  return (
    <Modal open={open} title="Add a section" onClose={onClose} width={520}>
      <div className="space-y-5">
        <Field
          label="Section name"
          help="Use plain language — this is only how you will recognise the block, e.g. “Why Choose Us”."
        >
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Why Choose Us"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onAdd(name)}>
            Add section
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Typed section form ─────────────────────────────────────────────────── */

const SCALAR_ORDER = [
  "subject",
  "notice",
  "eyebrow",
  "headline",
  "headline_before",
  "headline_gradient",
  "headline_after",
  "heading",
  "title",
  "subhead",
  "body",
  "hook",
  "cta_label",
  "cta_target",
  "primary_cta_label",
  "primary_cta_target",
  "secondary_cta_label",
  "secondary_cta_target",
  "link_label",
  "link_target",
  "whatsapp_line",
  "footer_note",
  "contact_line",
  "address_line",
  "legal_line",
];

export function SectionForm({
  section,
  pages,
  onBack,
  onSaved,
}: {
  section: SectionRow;
  pages: PageOption[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, unknown>>(section.content);
  const [saving, setSaving] = useState(false);
  const original = useRef(JSON.stringify(section.content));
  const dirty = JSON.stringify(draft) !== original.current;
  const guard = useUnsavedGuard(dirty);

  const keys = useMemo(() => {
    const all = Object.keys(draft).filter((k) => k !== "theme");
    const scalars = all.filter((k) => !Array.isArray(draft[k]));
    const lists = all.filter((k) => Array.isArray(draft[k]));
    scalars.sort((a, b) => {
      const ia = SCALAR_ORDER.indexOf(a);
      const ib = SCALAR_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return { scalars, lists };
  }, [draft]);

  function set(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);

    const { error } = await verifyRowsAffected(
      supabase
        .from("page_sections")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ content: draft as any })
        .eq("id", section.id),
    );
    setSaving(false);
    if (error) return toast(toSafeErrorMessage(error, "Could not save that section."), "error");
    original.current = JSON.stringify(draft);
    toast(`${sectionLabel(section.section_key)} saved — the live page is updated.`);
    onSaved();
  }

  const theme = (draft.theme as string) === "light" ? "light" : "dark";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button icon={<ArrowLeft className="size-3.5" />} onClick={() => guard(onBack)}>
          Back to {pageLabel(section.page_slug)} sections
        </Button>
        <div className="flex items-center gap-3">
          {dirty && <span className="text-xs text-amber-300">Unsaved changes</span>}
          <Button variant="primary" disabled={saving || !dirty} onClick={save}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <Panel
        title={sectionLabel(section.section_key)}
        hint={
          SECTION_DESCRIPTIONS[section.section_key] ?? "Everything here appears on the live page."
        }
      >
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            {keys.scalars.map((key) => (
              <ScalarField
                key={key}
                fieldKey={key}
                value={draft[key]}
                pages={pages}
                onChange={(v) => set(key, v)}
              />
            ))}
          </div>

          <Field
            label="Section background"
            help="Tells you at a glance whether this block sits on a dark or light band of the page."
          >
            <SelectInput value={theme} onChange={(e) => set("theme", e.target.value)}>
              <option value="dark">Dark background</option>
              <option value="light">Light background</option>
            </SelectInput>
          </Field>
        </div>
      </Panel>

      {keys.lists.map((key) => (
        <ListEditor
          key={key}
          fieldKey={key}
          items={(draft[key] as unknown[]) ?? []}
          pages={pages}
          onChange={(items) => set(key, items)}
        />
      ))}
    </div>
  );
}

function ScalarField({
  fieldKey,
  value,
  pages,
  onChange,
}: {
  fieldKey: string;
  value: unknown;
  pages: PageOption[];
  onChange: (v: unknown) => void;
}) {
  const meta = fieldMeta(fieldKey);
  const kind = inferKind(fieldKey, value);
  const str = typeof value === "string" ? value : value == null ? "" : String(value);

  if (kind === "image") {
    return (
      <ImagePicker
        label={meta.label}
        help={meta.help}
        value={str || null}
        onChange={(id) => onChange(id)}
      />
    );
  }

  if (kind === "link") {
    return (
      <LinkField
        label={meta.label}
        help={meta.help}
        value={str}
        pages={pages}
        onChange={onChange}
      />
    );
  }

  if (kind === "textarea") {
    return (
      <div className="md:col-span-2">
        <Field label={meta.label} help={meta.help}>
          <TextArea value={str} rows={3} onChange={(e) => onChange(e.target.value)} />
        </Field>
      </div>
    );
  }

  return (
    <Field label={meta.label} help={meta.help}>
      <TextInput value={str} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function LinkField({
  label,
  help,
  value,
  pages,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  pages: PageOption[];
  onChange: (v: string) => void;
}) {
  const options = useMemo(() => {
    const list = pages.map((p) => ({ value: pagePath(p.slug), label: pageLabel(p.slug) }));
    for (const extra of ["/dashboard/login"]) {
      if (!list.some((o) => o.value === extra)) {
        list.push({ value: extra, label: "Staff sign-in" });
      }
    }
    return list;
  }, [pages]);

  const isExternal = pages.length > 0 && value !== "" && !options.some((o) => o.value === value);
  const [external, setExternal] = useState(isExternal);

  useEffect(() => setExternal(isExternal), [isExternal]);

  return (
    <div className="space-y-2">
      <Field label={label} help={help}>
        <SelectInput
          value={external ? "__external" : value}
          onChange={(e) => {
            if (e.target.value === "__external") {
              setExternal(true);
              onChange("");
            } else {
              setExternal(false);
              onChange(e.target.value);
            }
          }}
        >
          <option value="">Nowhere yet</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label} page
            </option>
          ))}
          <option value="__external">External link…</option>
        </SelectInput>
      </Field>
      {external && (
        <Field label="Web address" help="Paste the full address, starting with https://">
          <TextInput
            value={value}
            placeholder="https://example.com"
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      )}
    </div>
  );
}

/* ── Repeating content ──────────────────────────────────────────────────── */

function ListEditor({
  fieldKey,
  items,
  pages,
  onChange,
}: {
  fieldKey: string;
  items: unknown[];
  pages: PageOption[];
  onChange: (items: unknown[]) => void;
}) {
  const meta = fieldMeta(fieldKey);
  const noun = LIST_ITEM_NOUN[fieldKey] ?? "item";
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  const isStringList = items.length > 0 && typeof items[0] === "string";

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  const dragProps = useDragReorder(move);

  function add() {
    if (isStringList || items.length === 0) {
      onChange([...items, ""]);
      return;
    }
    const shape = items[0] as Record<string, unknown>;
    const blank: Record<string, unknown> = {};
    for (const k of Object.keys(shape)) blank[k] = Array.isArray(shape[k]) ? [] : "";
    onChange([...items, blank]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setConfirmIndex(null);
  }

  return (
    <Panel
      title={meta.label}
      hint={LIST_HELP[fieldKey] ?? `Each entry becomes one ${noun} on the live page.`}
      actions={
        <Button size="sm" icon={<Plus className="size-3.5" />} onClick={add}>
          Add {noun}
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          title={`No ${noun}s yet`}
          description={`Add your first ${noun} to show this block on the live page.`}
          action={
            <Button variant="primary" onClick={add}>
              Add {noun}
            </Button>
          }
        />
      ) : (
        <ol className="space-y-4">
          {items.map((item, i) => (
            <li
              key={i}
              {...dragProps(i)}
              className="rounded-lg border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] p-4 data-[dragging=true]:opacity-50"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <DragHandle />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
                    {humanize(noun)} {i + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                    ↑
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={i === items.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    ↓
                  </IconButton>
                  <IconButton label={`Remove this ${noun}`} onClick={() => setConfirmIndex(i)}>
                    <Trash2 className="size-4" aria-hidden />
                  </IconButton>
                </div>
              </div>

              {typeof item === "string" ? (
                <Field
                  label={meta.label.replace(/s$/, "")}
                  help="Shown exactly as written on the live page."
                >
                  <TextInput
                    value={item}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = e.target.value;
                      onChange(next);
                    }}
                  />
                </Field>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.keys(item as Record<string, unknown>)
                    .filter((k) => k !== "id")
                    .map((k) => {
                      const record = item as Record<string, unknown>;
                      const val = record[k];
                      if (Array.isArray(val)) {
                        return (
                          <div key={k} className="md:col-span-2">
                            <Field
                              label={fieldMeta(k).label}
                              help={`${fieldMeta(k).help ?? "One per line."} Write one per line.`}
                            >
                              <TextArea
                                rows={Math.max(3, val.length)}
                                value={(val as string[]).join("\n")}
                                onChange={(e) => {
                                  const next = [...items];
                                  next[i] = {
                                    ...record,
                                    [k]: e.target.value.split("\n").filter((s) => s.trim() !== ""),
                                  };
                                  onChange(next);
                                }}
                              />
                            </Field>
                          </div>
                        );
                      }
                      const kind = inferKind(k, val);
                      const text = typeof val === "string" ? val : val == null ? "" : String(val);
                      const update = (v: string) => {
                        const next = [...items];
                        next[i] = { ...record, [k]: v };
                        onChange(next);
                      };
                      if (kind === "link") {
                        return (
                          <LinkField
                            key={k}
                            label={fieldMeta(k).label}
                            help={fieldMeta(k).help}
                            value={text}
                            pages={pages}
                            onChange={update}
                          />
                        );
                      }
                      if (kind === "image") {
                        return (
                          <ImagePicker
                            key={k}
                            label={fieldMeta(k).label}
                            help={fieldMeta(k).help}
                            value={text || null}
                            onChange={(id) => update(id ?? "")}
                          />
                        );
                      }
                      return (
                        <div key={k} className={kind === "textarea" ? "md:col-span-2" : ""}>
                          <Field label={fieldMeta(k).label} help={fieldMeta(k).help}>
                            {kind === "textarea" ? (
                              <TextArea value={text} onChange={(e) => update(e.target.value)} />
                            ) : (
                              <TextInput value={text} onChange={(e) => update(e.target.value)} />
                            )}
                          </Field>
                        </div>
                      );
                    })}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <ConfirmDialog
        open={confirmIndex !== null}
        danger
        title={`Remove this ${noun}?`}
        confirmLabel="Remove"
        description={`It will disappear from the live page once you save the section.`}
        onCancel={() => setConfirmIndex(null)}
        onConfirm={() => confirmIndex !== null && remove(confirmIndex)}
      />
    </Panel>
  );
}
