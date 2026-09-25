import { useCallback, useEffect, useState } from "react";
import { Eye, Lock, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import {
  Button,
  ConfirmDialog,
  DragHandle,
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
import {
  FIELD_TYPES,
  FIELD_TYPE_LABEL,
  LOCKED_CORE_FIELDS,
  type FieldType,
  type RegistrationField,
} from "@/lib/registrations.shared";
import { RegistrationModal } from "@/components/camp/RegistrationModal";

/**
 * CMS management of the extra questions asked on the camp registration form.
 *
 * The locked core fields are shown read-only at the top so an editor can see
 * the whole form, and deactivating a question never deletes answers already
 * collected — `active` is set to false instead.
 */

type Draft = {
  id: string | null;
  label: string;
  field_type: FieldType;
  options: string[];
  required: boolean;
  help_text: string;
};

const EMPTY: Draft = {
  id: null,
  label: "",
  field_type: "text",
  options: [],
  required: false,
  help_text: "",
};

const NEEDS_OPTIONS: FieldType[] = ["dropdown", "radio"];

export function RegistrationFormPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<RegistrationField[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RegistrationField | null>(null);
  const [preview, setPreview] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("registration_fields" as any) as any)
      .select("id, label, field_type, options, required, help_text, order, active")
      .order("order")
      .order("id");
    setErr(error ? toSafeErrorMessage(error, "Could not load the registration form.") : null);
    setRows(
      ((data ?? []) as RegistrationField[]).map((r) => ({
        ...r,
        options: Array.isArray(r.options) ? r.options : [],
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function persistOrder(next: RegistrationField[]) {
    setRows(next);
    const results = await Promise.all(
      next.map((r, i) =>
        verifyRowsAffected(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase.from("registration_fields" as any) as any).update({ order: i }).eq("id", r.id),
        ),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed) {
      toast(toSafeErrorMessage(failed.error, "Could not save that order."), "error");
      refresh();
    }
  }

  const dragProps = useDragReorder((from, to) => {
    const next = rows.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistOrder(next);
  });

  async function toggleActive(row: RegistrationField, active: boolean) {
    // Deliberately an update, never a delete: answers already collected stay.
    const { error } = await verifyRowsAffected(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("registration_fields" as any) as any).update({ active }).eq("id", row.id),
    );
    if (error) return toast(toSafeErrorMessage(error, "Could not update that question."), "error");
    toast(active ? "Question switched on." : "Question switched off. Past answers are kept.");
    refresh();
  }

  async function save() {
    if (!draft) return;
    if (draft.label.trim().length < 2) return toast("Give the question a label.", "error");
    if (NEEDS_OPTIONS.includes(draft.field_type) && draft.options.filter(Boolean).length < 2)
      return toast("Add at least two choices.", "error");

    setSaving(true);
    const values = {
      label: draft.label.trim(),
      field_type: draft.field_type,
      options: NEEDS_OPTIONS.includes(draft.field_type) ? draft.options.filter(Boolean) : [],
      required: draft.required,
      help_text: draft.help_text.trim() || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from("registration_fields" as any) as any;
    const { error } = draft.id
      ? await verifyRowsAffected(table.update(values).eq("id", draft.id))
      : await table.insert({ ...values, order: rows.length, active: true });
    setSaving(false);
    if (error) return toast(toSafeErrorMessage(error, "Could not save that question."), "error");
    toast(draft.id ? "Question updated." : "Question added.");
    setDraft(null);
    refresh();
  }

  async function remove(row: RegistrationField) {
    // Targets exactly one id — never a pattern or an unfiltered clause.
    const { error } = await verifyRowsAffected(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("registration_fields" as any) as any).delete().eq("id", row.id),
    );
    setConfirmDelete(null);
    if (error) return toast(toSafeErrorMessage(error, "Could not remove that question."), "error");
    toast("Question removed. Answers already collected are unaffected.");
    refresh();
  }

  if (loading) return <LoadingState label="Loading the registration form…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}

      <div className="rounded-lg border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-[color:var(--bp-ink-2)]">
        This form collects information about children. Only add fields you genuinely need for
        running the camp — avoid addresses, ID numbers, or anything not operationally necessary.
      </div>

      <Panel
        title="Always included"
        hint="These questions appear on every registration and cannot be changed or removed here."
      >
        <ul className="divide-y divide-[color:var(--bp-line)]">
          {LOCKED_CORE_FIELDS.map((f) => (
            <li key={f.label} className="flex items-center gap-3 py-2.5 text-sm">
              <Lock className="size-3.5 shrink-0 text-[color:var(--bp-muted)]" aria-hidden />
              <span className="flex-1 text-[color:var(--bp-ink)]">{f.label}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--bp-muted)]">
                {f.type}
              </span>
              <span className="w-20 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--bp-muted)]">
                {f.required ? "Required" : "Optional"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Your extra questions"
        hint="Drag to change the order these appear in, after the questions above."
        actions={
          <div className="flex gap-2">
            <Button icon={<Eye className="size-3.5" />} onClick={() => setPreview(true)}>
              Preview form
            </Button>
            <Button
              variant="primary"
              icon={<Plus className="size-3.5" />}
              onClick={() => setDraft(EMPTY)}
            >
              Add question
            </Button>
          </div>
        }
      >
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-[color:var(--bp-ink-2)]">
            No extra questions yet — the form asks only the questions above.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--bp-line)]">
            {rows.map((r, i) => (
              <li
                key={r.id}
                {...dragProps(i)}
                className="flex flex-wrap items-center gap-3 py-3 data-[dragging=true]:opacity-50"
              >
                <DragHandle />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[color:var(--bp-ink)]">
                    {r.label}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--bp-muted)]">
                    {FIELD_TYPE_LABEL[r.field_type]} · {r.required ? "Required" : "Optional"}
                  </p>
                </div>
                <Toggle
                  checked={r.active}
                  onChange={(v) => toggleActive(r, v)}
                  label={r.active ? "Shown" : "Hidden"}
                />
                <Button
                  size="sm"
                  onClick={() =>
                    setDraft({
                      id: r.id,
                      label: r.label,
                      field_type: r.field_type,
                      options: r.options,
                      required: r.required,
                      help_text: r.help_text ?? "",
                    })
                  }
                >
                  Edit
                </Button>
                <IconButton label={`Delete ${r.label}`} onClick={() => setConfirmDelete(r)}>
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Modal
        open={draft !== null}
        title={draft?.id ? "Edit question" : "Add question"}
        onClose={() => setDraft(null)}
        width={620}
      >
        {draft && (
          <div className="space-y-5">
            <Field label="Question" help="What the parent sees above the answer box.">
              <TextInput
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Answer type" help="How the parent answers this question.">
                <SelectInput
                  value={draft.field_type}
                  onChange={(e) => setDraft({ ...draft, field_type: e.target.value as FieldType })}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABEL[t]}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <div className="flex items-end pb-1">
                <Toggle
                  checked={draft.required}
                  onChange={(v) => setDraft({ ...draft, required: v })}
                  label="Must be answered"
                />
              </div>
            </div>

            {NEEDS_OPTIONS.includes(draft.field_type) && (
              <Field label="Choices" help="One per line. Parents pick from these.">
                <TextArea
                  rows={4}
                  value={draft.options.join("\n")}
                  onChange={(e) => setDraft({ ...draft, options: e.target.value.split("\n") })}
                />
              </Field>
            )}

            <Field label="Helper text" help="Optional guidance shown under the answer box.">
              <TextInput
                value={draft.help_text}
                onChange={(e) => setDraft({ ...draft, help_text: e.target.value })}
              />
            </Field>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setDraft(null)}>Cancel</Button>
              <Button variant="primary" disabled={saving} onClick={save}>
                {saving ? "Saving…" : "Save question"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this question?"
        danger
        confirmLabel="Delete question"
        description={
          <>
            <p>
              "{confirmDelete?.label}" will no longer be asked on the registration form. Answers
              already collected stay on their registrations.
            </p>
            <p className="mt-2">
              If you only want to pause this question, switch it off instead — you can switch it
              back on later.
            </p>
          </>
        }
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
      />

      {preview && (
        <RegistrationModal
          preview
          campNameOverride="Form preview"
          fieldsOverride={rows}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  );
}
