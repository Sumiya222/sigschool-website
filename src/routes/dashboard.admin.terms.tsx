import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { formatDate } from "@/lib/format-date";
import { DateField } from "@/components/ui/date-field";

export const Route = createFileRoute("/dashboard/admin/terms")({
  component: TermsPage,
});

interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

type Status = "Active" | "Inactive" | "Upcoming" | "Ended";

function deriveStatus(t: Term, today: string): Status {
  if (t.is_active) return "Active";
  if (today < t.start_date) return "Upcoming";
  if (today > t.end_date) return "Ended";
  return "Inactive";
}

function rangesOverlap(a1: string, a2: string, b1: string, b2: string) {
  return a1 <= b2 && b1 <= a2;
}

function TermsPage() {
  const [rows, setRows] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [overlapWarn, setOverlapWarn] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("terms")
      .select("id, name, start_date, end_date, is_active")
      .order("start_date", { ascending: false });
    if (error) setErr(toSafeErrorMessage(error, "Could not load terms."));
    setRows((data as Term[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setStartDate("");
    setEndDate("");
    setFormErr(null);
    setOverlapWarn(null);
  }

  function checkOverlap(s: string, e: string, excludeId: string | null) {
    if (!s || !e) return null;
    const hit = rows.find(
      (r) => r.id !== excludeId && rangesOverlap(s, e, r.start_date, r.end_date),
    );
    return hit
      ? `Overlaps with "${hit.name}" (${formatDate(hit.start_date)} → ${formatDate(hit.end_date)}).`
      : null;
  }

  async function onSubmit(evt: FormEvent) {
    evt.preventDefault();
    setFormErr(null);
    if (!name.trim() || !startDate || !endDate) {
      setFormErr("All fields are required.");
      return;
    }
    if (endDate <= startDate) {
      setFormErr("End date must be after start date.");
      return;
    }
    setSubmitting(true);
    if (editingId) {
      const { error } = await verifyRowsAffected(
        supabase
          .from("terms")
          .update({ name: name.trim(), start_date: startDate, end_date: endDate })
          .eq("id", editingId),
      );
      setSubmitting(false);
      if (error) return setFormErr(toSafeErrorMessage(error, "Could not save that term."));
    } else {
      const { error } = await supabase.from("terms").insert({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        is_active: false,
      });
      setSubmitting(false);
      if (error) return setFormErr(toSafeErrorMessage(error, "Could not save that term."));
    }
    resetForm();
    refresh();
  }

  function onEdit(t: Term) {
    setEditingId(t.id);
    setName(t.name);
    setStartDate(t.start_date);
    setEndDate(t.end_date);
    setFormErr(null);
    setOverlapWarn(checkOverlap(t.start_date, t.end_date, t.id));
  }

  async function onSetActive(t: Term) {
    const current = rows.find((r) => r.is_active);
    if (current?.id === t.id) return;
    const msg = current
      ? `This will change the active term from "${current.name}" to "${t.name}" — instructors and schools will now see "${t.name}" by default. Are you sure?`
      : `Activate "${t.name}"? Instructors and schools will now see it as the current term by default.`;
    if (!window.confirm(msg)) return;
    const { error } = await supabase.rpc("set_active_term", { _term_id: t.id });
    if (error) {
      alert(toSafeErrorMessage(error, "Could not activate that term."));
      return;
    }
    refresh();
  }

  async function onDelete(t: Term) {
    const { count, error: cErr } = await supabase
      .from("class_sessions")
      .select("id", { count: "exact", head: true })
      .eq("term_id", t.id);
    if (cErr) {
      alert(toSafeErrorMessage(cErr, "Could not check whether that term is in use."));
      return;
    }
    if ((count ?? 0) > 0) {
      alert(
        `Cannot delete "${t.name}" — ${count} class session(s) are attached to it. Deleting would orphan attendance, marks, and remarks tied to this term.`,
      );
      return;
    }
    if (!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return;
    const { error } = await verifyRowsAffected(supabase.from("terms").delete().eq("id", t.id));
    if (error) {
      alert(toSafeErrorMessage(error, "Could not delete that term."));
      return;
    }
    if (editingId === t.id) resetForm();
    refresh();
  }

  const activeTerm = rows.find((r) => r.is_active);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--bp-muted)]">
          Admin · Academic calendar
        </div>
        <h1 className="font-display text-2xl font-semibold text-[color:var(--bp-ink)] sm:text-3xl">
          Term management
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--bp-ink-2)]">
          The active term is the default across every instructor and school dashboard. Exactly one
          term can be active at a time.
        </p>
        {activeTerm ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--bp-indigo)]/40 bg-[color:var(--bp-indigo)]/8 px-3 py-1 text-xs font-medium text-[color:var(--bp-indigo)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--bp-indigo)] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[color:var(--bp-indigo)]" />
            </span>
            Active · {activeTerm.name} · {formatDate(activeTerm.start_date)} →{" "}
            {formatDate(activeTerm.end_date)}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-3 py-1 text-xs font-medium text-[color:var(--bp-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--bp-muted)]" />
            No active term set
          </div>
        )}
      </header>

      {/* Form */}
      <section className="bp-panel relative p-6 sm:p-8">
        <span className="bp-tick-tl" />
        <span className="bp-tick-tr" />
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
            {editingId ? "Edit term" : "Add new term"}
          </h2>
          {editingId && (
            <span className="rounded-full border border-[color:var(--bp-indigo)]/40 bg-[color:var(--bp-indigo)]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--bp-indigo)]">
              Editing
            </span>
          )}
        </div>
        <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-4">
          <label className="md:col-span-4 lg:col-span-2 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
              Term name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Term 1 – Robotics Fundamentals"
              className="w-full rounded-md border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)] px-3.5 py-2.5 text-sm text-[color:var(--bp-ink)] outline-none transition focus:border-[color:var(--bp-indigo)] focus:ring-2 focus:ring-[color:var(--bp-indigo)]/25"
            />
            <span className="text-[11px] leading-relaxed text-[color:var(--bp-muted)]">
              An academic year usually has three terms. Include the theme when useful — e.g. "Term 2
              – Advanced Robotics".
            </span>
          </label>
          <label className="md:col-span-2 lg:col-span-1 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
              Start date
            </span>
            <DateField
              value={startDate}
              onChange={(v) => {
                setStartDate(v);
                setOverlapWarn(checkOverlap(v, endDate, editingId));
              }}
            />
          </label>
          <label className="md:col-span-2 lg:col-span-1 flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
              End date
            </span>
            <DateField
              value={endDate}
              onChange={(v) => {
                setEndDate(v);
                setOverlapWarn(checkOverlap(startDate, v, editingId));
              }}
            />
          </label>

          <div className="md:col-span-4 flex flex-wrap items-center gap-3 border-t border-[color:var(--bp-line)] pt-5">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[color:var(--bp-indigo)] px-5 py-2 text-sm font-semibold text-[#0b0b1e] transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "Saving…" : editingId ? "Save changes" : "Add term"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-4 py-2 text-sm text-[color:var(--bp-ink)] transition hover:border-[color:var(--bp-indigo)]"
              >
                Cancel
              </button>
            )}
            {overlapWarn && (
              <span className="text-xs text-amber-600 dark:text-amber-300">
                ⚠ {overlapWarn} (allowed, but unusual.)
              </span>
            )}
            {formErr && <span className="text-xs text-red-600 dark:text-red-300">{formErr}</span>}
          </div>
        </form>
      </section>

      {/* Table */}
      <section className="bp-panel relative overflow-hidden">
        <span className="bp-tick-tl" />
        <span className="bp-tick-tr" />
        <div className="flex items-center justify-between border-b border-[color:var(--bp-line)] px-6 py-4">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
            All terms
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--bp-muted)]">
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        {loading ? (
          <div className="p-8 text-sm text-[color:var(--bp-ink-2)]">Loading terms…</div>
        ) : err ? (
          <div className="p-8 text-sm text-red-600 dark:text-red-300">{err}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[color:var(--bp-muted)]">
            No terms yet. Add one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-[color:var(--bp-line-strong)] text-left">
                  <th className="px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
                    Name
                  </th>
                  <th className="px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
                    Start
                  </th>
                  <th className="px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
                    End
                  </th>
                  <th className="px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((t) => {
                  const status = deriveStatus(t, today);
                  return (
                    <tr
                      key={t.id}
                      className={
                        "border-b border-[color:var(--bp-line)] transition " +
                        (t.is_active
                          ? "bg-[color:var(--bp-indigo)]/5 shadow-[inset_2px_0_0_0_var(--bp-indigo)]"
                          : "hover:bg-[color:var(--bp-paper-2)]/40")
                      }
                    >
                      <td className="px-6 py-4 text-[color:var(--bp-ink)]">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t.name}</span>
                          {t.is_active && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--bp-indigo)]/40 bg-[color:var(--bp-indigo)]/8 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-[color:var(--bp-indigo)]">
                              <span className="relative flex h-1 w-1">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--bp-indigo)] opacity-70" />
                                <span className="relative inline-flex h-1 w-1 rounded-full bg-[color:var(--bp-indigo)]" />
                              </span>
                              Live
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-[color:var(--bp-ink-2)]">
                        {formatDate(t.start_date)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-[color:var(--bp-ink-2)]">
                        {formatDate(t.end_date)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {!t.is_active && (
                            <button
                              onClick={() => onSetActive(t)}
                              className="rounded-full border border-[color:var(--bp-indigo)]/40 bg-transparent px-3 py-1.5 text-xs font-medium text-[color:var(--bp-indigo)] transition hover:bg-[color:var(--bp-indigo)]/10 hover:border-[color:var(--bp-indigo)]"
                            >
                              Set as active
                            </button>
                          )}
                          <button
                            onClick={() => onEdit(t)}
                            className="rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-3 py-1.5 text-xs font-medium text-[color:var(--bp-ink)] transition hover:border-[color:var(--bp-indigo)]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(t)}
                            className="rounded-full border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/10 dark:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && rows.length > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--bp-line)] px-6 py-3 font-mono text-[11px] text-[color:var(--bp-muted)]">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of{" "}
              {rows.length}
            </span>
            <div className="inline-flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-3 py-1 text-[color:var(--bp-ink)] transition hover:border-[color:var(--bp-indigo)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 uppercase tracking-widest">
                Page {page} / {Math.max(1, Math.ceil(rows.length / PAGE_SIZE))}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(rows.length / PAGE_SIZE), p + 1))}
                disabled={page >= Math.ceil(rows.length / PAGE_SIZE)}
                className="rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-3 py-1 text-[color:var(--bp-ink)] transition hover:border-[color:var(--bp-indigo)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { cls: string; dot: string; pulse?: boolean }> = {
    Active: {
      cls: "border-[color:var(--bp-indigo)]/40 bg-[color:var(--bp-indigo)]/8 text-[color:var(--bp-indigo)]",
      dot: "bg-[color:var(--bp-indigo)]",
      pulse: true,
    },
    Upcoming: {
      cls: "border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] text-[color:var(--bp-ink-2)]",
      dot: "bg-[color:var(--bp-ink-2)]",
    },
    Inactive: {
      cls: "border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] text-[color:var(--bp-ink-2)]",
      dot: "bg-[color:var(--bp-ink-2)]/60",
    },
    Ended: {
      cls: "border-[color:var(--bp-line)] bg-transparent text-[color:var(--bp-muted)]",
      dot: "bg-[color:var(--bp-muted)]/60",
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.pulse ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}
