import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
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
  LabelledField,
  LoadingState,
  Modal,
  Panel,
  SelectInput,
  Table,
  Td,
  Th,
  Toggle,
  cx,
  useToast,
} from "@/components/dashboard/ui";
import { EMPLOYMENT_TYPES, type EmploymentType } from "@/lib/careers.shared";

type Status = "open" | "closed";

interface Row {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: EmploymentType;
  description: string;
  responsibilities: string;
  requirements: string;
  posted_at: string;
  closes_at: string | null;
  status: Status;
  order: number;
  visible: boolean;
}

const STATUS_LABEL: Record<Status, string> = {
  open: "Open",
  closed: "Closed",
};

const BLANK = {
  title: "",
  department: "",
  location: "",
  employment_type: "Full-time" as EmploymentType,
  description: "",
  responsibilities: "",
  requirements: "",
  closes_at: "",
  status: "closed" as Status,
  visible: true,
};

type Draft = typeof BLANK;

const SELECT =
  "id, title, department, location, employment_type, description, responsibilities, requirements, posted_at, closes_at, status, order, visible";

export function JobOpeningsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [fieldErr, setFieldErr] = useState<Partial<Record<keyof Draft, string>>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("job_openings")
      .select(SELECT)
      .order("order")
      .order("id");
    if (error) setErr(toSafeErrorMessage(error, "Could not load job openings."));
    else {
      setErr(null);
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const openCount = useMemo(
    () => rows.filter((r) => r.status === "open" && r.visible).length,
    [rows],
  );

  function startCreate() {
    setDraft(BLANK);
    setFieldErr({});
    setCreating(true);
  }

  function startEdit(row: Row) {
    setDraft({
      title: row.title,
      department: row.department,
      location: row.location,
      employment_type: row.employment_type,
      description: row.description,
      responsibilities: row.responsibilities,
      requirements: row.requirements,
      closes_at: row.closes_at ?? "",
      status: row.status,
      visible: row.visible,
    });
    setFieldErr({});
    setEditing(row);
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function save() {
    const errs: Partial<Record<keyof Draft, string>> = {};
    if (draft.title.trim().length < 2) errs.title = "A job title is required.";
    if (draft.department.trim().length < 2) errs.department = "A department is required.";
    if (draft.location.trim().length < 2) errs.location = "A location is required.";
    if (draft.description.trim().length < 10)
      errs.description = "Please write a short description of the role.";
    setFieldErr(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const payload = {
      title: draft.title.trim(),
      department: draft.department.trim(),
      location: draft.location.trim(),
      employment_type: draft.employment_type,
      description: draft.description.trim(),
      responsibilities: draft.responsibilities.trim(),
      requirements: draft.requirements.trim(),
      closes_at: draft.closes_at || null,
      status: draft.status,
      visible: draft.visible,
    };

    const { error } = editing
      ? await verifyRowsAffected(supabase.from("job_openings").update(payload).eq("id", editing.id))
      : await supabase.from("job_openings").insert({ ...payload, order: rows.length + 1 });

    setSaving(false);
    if (error) {
      toast("That role could not be saved.", "error");
      return;
    }
    toast(editing ? "Role updated." : "Role added.");
    closeForm();
    void load();
  }

  async function toggleVisible(row: Row) {
    const previous = rows;
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, visible: !x.visible } : x)));
    const { error } = await verifyRowsAffected(
      supabase.from("job_openings").update({ visible: !row.visible }).eq("id", row.id),
    );
    if (error) {
      setRows(previous);
      toast("Could not change that role's visibility.", "error");
    }
  }

  async function remove(row: Row) {
    setConfirmDelete(null);
    const { error } = await verifyRowsAffected(
      supabase.from("job_openings").delete().eq("id", row.id),
    );
    if (error) {
      toast("That role could not be removed. Applications may still be attached to it.", "error");
      return;
    }
    toast("Role removed.");
    void load();
  }

  if (loading) return <LoadingState label="Loading job openings…" />;
  if (err) return <ErrorNote>{err}</ErrorNote>;

  const formOpen = creating || editing !== null;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[color:var(--bp-ink-2)]">
            {rows.length} role{rows.length === 1 ? "" : "s"} · {openCount} live on the Careers page
          </p>
          <Button variant="primary" onClick={startCreate}>
            <Plus className="size-3.5" aria-hidden />
            Add a role
          </Button>
        </div>
      </Panel>

      {rows.length === 0 ? (
        <EmptyState
          title="No roles yet"
          description="Add a role and it will appear on the Careers page as soon as you set it to Open and make it visible."
        />
      ) : (
        <Panel>
          <Table minWidth={860}>
            <thead>
              <tr>
                <Th>Role</Th>
                <Th>Department</Th>
                <Th>Location</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <span className="font-medium text-[color:var(--bp-ink)]">{r.title}</span>
                    {r.closes_at ? (
                      <span className="mt-0.5 block text-[11px] text-[color:var(--bp-muted)]">
                        Closes {new Date(r.closes_at).toLocaleDateString("en-GB")}
                      </span>
                    ) : null}
                  </Td>
                  <Td>{r.department}</Td>
                  <Td>{r.location}</Td>
                  <Td>{r.employment_type}</Td>
                  <Td>
                    <span
                      className={cx(
                        "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
                        r.status === "open" && r.visible
                          ? "border-[color:var(--bp-indigo)]/50 text-[color:var(--bp-indigo)]"
                          : "border-[color:var(--bp-line-strong)] text-[color:var(--bp-muted)]",
                      )}
                    >
                      {STATUS_LABEL[r.status]}
                      {r.status === "open" && !r.visible ? " · hidden" : ""}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <IconButton
                        label={r.visible ? `Hide ${r.title}` : `Show ${r.title}`}
                        onClick={() => toggleVisible(r)}
                      >
                        {r.visible ? (
                          <Eye className="size-4" aria-hidden />
                        ) : (
                          <EyeOff className="size-4" aria-hidden />
                        )}
                      </IconButton>
                      <IconButton label={`Edit ${r.title}`} onClick={() => startEdit(r)}>
                        <Pencil className="size-4" aria-hidden />
                      </IconButton>
                      <IconButton label={`Remove ${r.title}`} onClick={() => setConfirmDelete(r)}>
                        <Trash2 className="size-4" aria-hidden />
                      </IconButton>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}

      <Modal
        open={formOpen}
        title={editing ? `Edit ${editing.title}` : "Add a role"}
        onClose={closeForm}
        width={780}
      >
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <LabelledField
                label="Job title"
                value={draft.title}
                onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
                placeholder="Robotics Instructor"
              />
              {fieldErr.title ? (
                <p className="mt-1 text-[11px] text-red-300">{fieldErr.title}</p>
              ) : null}
            </div>
            <div>
              <LabelledField
                label="Department"
                value={draft.department}
                onChange={(v) => setDraft((d) => ({ ...d, department: v }))}
                placeholder="Instruction"
              />
              {fieldErr.department ? (
                <p className="mt-1 text-[11px] text-red-300">{fieldErr.department}</p>
              ) : null}
            </div>
            <div>
              <LabelledField
                label="Location"
                value={draft.location}
                onChange={(v) => setDraft((d) => ({ ...d, location: v }))}
                placeholder="Rawalpindi / Islamabad"
              />
              {fieldErr.location ? (
                <p className="mt-1 text-[11px] text-red-300">{fieldErr.location}</p>
              ) : null}
            </div>
            <Field label="Employment type">
              <SelectInput
                value={draft.employment_type}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, employment_type: e.target.value as EmploymentType }))
                }
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field
              label="Closing date"
              help="Leave blank to keep the role open until you close it yourself."
            >
              <input
                type="date"
                value={draft.closes_at}
                onChange={(e) => setDraft((d) => ({ ...d, closes_at: e.target.value }))}
                className="w-full rounded-lg border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-3 py-2 text-sm text-[color:var(--bp-ink)]"
              />
            </Field>
          </div>

          <div>
            <LabelledField
              label="About the role"
              multiline
              value={draft.description}
              onChange={(v) => setDraft((d) => ({ ...d, description: v }))}
              help="A short paragraph shown when someone expands the role."
            />
            {fieldErr.description ? (
              <p className="mt-1 text-[11px] text-red-300">{fieldErr.description}</p>
            ) : null}
          </div>

          <LabelledField
            label="What they'd do"
            multiline
            value={draft.responsibilities}
            onChange={(v) => setDraft((d) => ({ ...d, responsibilities: v }))}
            help="One responsibility per line. Each line becomes a bullet point."
          />
          <LabelledField
            label="What we need"
            multiline
            value={draft.requirements}
            onChange={(v) => setDraft((d) => ({ ...d, requirements: v }))}
            help="One requirement per line. Each line becomes a bullet point."
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Status"
              help="Only Open roles appear on the website. New roles start Closed so you can draft them first."
            >
              <SelectInput
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as Status }))}
              >
                <option value="open">Open — accepting applications</option>
                <option value="closed">Closed — not accepting applications</option>
              </SelectInput>
            </Field>
            <div className="flex items-end">
              <Toggle
                checked={draft.visible}
                onChange={(v) => setDraft((d) => ({ ...d, visible: v }))}
                label="Show on the website"
                help="Turn this off to hide the role without changing its status."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[color:var(--bp-line)] pt-4">
            <Button onClick={closeForm}>Cancel</Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add role"}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remove this role?"
        danger
        confirmLabel="Remove role"
        description={
          <>
            <strong>{confirmDelete?.title}</strong> will be removed from the Careers page.
            Applications already received are kept, but they will no longer show which role they
            were for. This cannot be undone.
          </>
        }
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
      />
    </div>
  );
}
