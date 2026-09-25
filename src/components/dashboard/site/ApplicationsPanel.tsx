import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import {
  Button,
  EmptyState,
  ErrorNote,
  LoadingState,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
  cx,
  useToast,
} from "@/components/dashboard/ui";
import { getApplicationCvUrl } from "@/lib/careers.functions";
import { isSafeLinkTarget } from "@/lib/link-target";

function linkedinHref(url: string): string {
  return url.startsWith("http") ? url : `https://${url}`;
}

type Status = "new" | "reviewing" | "interviewed" | "rejected" | "hired";

interface Row {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string | null;
  cover_note: string | null;
  cv_file_name: string | null;
  status: Status;
  notes: string | null;
  job_opening_id: string | null;
  job_openings: { title: string } | null;
}

interface RoleOption {
  id: string;
  title: string;
}

const STATUSES: Status[] = ["new", "reviewing", "interviewed", "rejected", "hired"];

const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  reviewing: "Reviewing",
  interviewed: "Interviewed",
  rejected: "Not proceeding",
  hired: "Hired",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function waLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

/** Preview shown in the collapsed card — the full note is fetched with the
 * row and shown in full on expand; this just keeps the collapsed view from
 * rendering a large block of text for every row on the page. */
function preview(text: string, max = 160): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

const COLUMNS =
  "id, created_at, full_name, email, phone, linkedin_url, cover_note, cv_file_name, status, notes, job_opening_id, job_openings(title)";

// True server-side pagination: each page is fetched with .range() and an
// exact count, so payload size never grows with the table regardless of how
// many pages exist — unlike a single capped fetch, older rows stay reachable
// by paging back instead of falling off a hard ceiling.
const PAGE_SIZE = 25;

export function ApplicationsPanel() {
  const toast = useToast();
  const fetchCv = useServerFn(getApplicationCvUrl);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pageIndex, setPageIndex] = useState(0);

  const load = useCallback(async () => {
    setRefreshing(true);
    let query = supabase
      .from("job_applications")
      .select(COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false });
    if (roleFilter === "general") query = query.is("job_opening_id", null);
    else if (roleFilter !== "all") query = query.eq("job_opening_id", roleFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
    const from = pageIndex * PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) setErr(toSafeErrorMessage(error, "Could not load applications."));
    else {
      setErr(null);
      setRows((data ?? []) as unknown as Row[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
    setRefreshing(false);
  }, [roleFilter, statusFilter, dateFrom, dateTo, pageIndex]);

  const refreshNewCount = useCallback(async () => {
    const { count } = await supabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    setNewCount(count ?? 0);
  }, []);

  /** The role dropdown needs every distinct role ever applied to, not just
   * whatever's on the current page — fetched once, independent of paging. */
  const loadRoles = useCallback(async () => {
    const { data } = await supabase
      .from("job_applications")
      .select("job_opening_id, job_openings(title)")
      .not("job_opening_id", "is", null);
    const map = new Map<string, string>();
    for (const r of (data ?? []) as unknown as {
      job_opening_id: string | null;
      job_openings: { title: string } | null;
    }[]) {
      if (r.job_opening_id && r.job_openings?.title)
        map.set(r.job_opening_id, r.job_openings.title);
    }
    setRoles(Array.from(map.entries()).map(([id, title]) => ({ id, title })));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void refreshNewCount();
  }, [refreshNewCount]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    setPageIndex(0);
  }, [roleFilter, statusFilter, dateFrom, dateTo]);

  async function setStatus(id: string, status: Status) {
    const previous = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await verifyRowsAffected(
      supabase.from("job_applications").update({ status }).eq("id", id),
    );
    if (error) {
      setRows(previous);
      toast("Could not update that application.", "error");
    } else {
      void refreshNewCount();
    }
  }

  /** Opening an application to read it is what clears "new" — no separate
   * read/unread button to click. Collapsing it back doesn't undo that. */
  function toggleExpand(r: Row) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(r.id)) next.delete(r.id);
      else next.add(r.id);
      return next;
    });
    if (r.status === "new") void setStatus(r.id, "reviewing");
  }

  async function deleteApplication(id: string) {
    if (!confirm("Delete this application? This cannot be undone.")) return;
    const { error } = await verifyRowsAffected(
      supabase.from("job_applications").delete().eq("id", id),
    );
    if (error) {
      toast("Could not delete that application.", "error");
    } else {
      toast("Application deleted.");
      void refreshNewCount();
      // A row on the last page can leave that page short — reload rather
      // than splice locally so the count and page contents stay accurate.
      void load();
    }
  }

  async function saveNote(id: string) {
    const notes = noteDraft[id] ?? "";
    const { error } = await verifyRowsAffected(
      supabase.from("job_applications").update({ notes }).eq("id", id),
    );
    if (error) {
      toast("Could not save that note.", "error");
      return;
    }
    setRows((r) => r.map((x) => (x.id === id ? { ...x, notes } : x)));
    setNoteDraft((d) => {
      const next = { ...d };
      delete next[id];
      return next;
    });
    toast("Note saved.");
  }

  async function openCv(row: Row) {
    setDownloading(row.id);
    try {
      const result = await fetchCv({ data: { applicationId: row.id } });
      if ("url" in result) window.open(result.url, "_blank", "noopener,noreferrer");
      else toast(result.error, "error");
    } catch {
      toast("That CV could not be opened.", "error");
    } finally {
      setDownloading(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(pageIndex + 1, totalPages);

  if (loading) return <LoadingState label="Loading applications…" />;
  if (err) return <ErrorNote>{err}</ErrorNote>;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="text-sm text-[color:var(--bp-ink-2)]">
            {totalCount} application{totalCount === 1 ? "" : "s"} matching these filters ·{" "}
            {newCount} not yet reviewed overall
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[color:var(--bp-ink-2)]">
              Role
              <SelectInput
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-52"
              >
                <option value="all">All</option>
                <option value="general">General applications</option>
                {roles.map(({ id, title }) => (
                  <option key={id} value={id}>
                    {title}
                  </option>
                ))}
              </SelectInput>
            </label>
            <label className="flex items-center gap-2 text-xs text-[color:var(--bp-ink-2)]">
              Status
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-44"
              >
                <option value="all">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </SelectInput>
            </label>
            <label className="flex items-center gap-2 text-xs text-[color:var(--bp-ink-2)]">
              From
              <TextInput
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo || undefined}
                className="w-40"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[color:var(--bp-ink-2)]">
              To
              <TextInput
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                className="w-40"
              />
            </label>
          </div>
        </div>
      </Panel>

      {rows.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Applications sent through the Careers page will appear here, with the CV attached."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const isOpen = expanded.has(r.id);
            return (
              <Panel key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-[color:var(--bp-ink)]">
                        {r.full_name}
                      </span>
                      <span
                        className={cx(
                          "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]",
                          r.status === "new"
                            ? "border-[color:var(--bp-indigo)]/50 text-[color:var(--bp-indigo)]"
                            : "border-[color:var(--bp-line-strong)] text-[color:var(--bp-muted)]",
                        )}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--bp-muted)]">
                      {formatDate(r.created_at)} · {r.job_openings?.title ?? "General application"}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--bp-ink-2)]">
                      {r.email} · {r.phone}
                    </p>
                    {r.linkedin_url && isSafeLinkTarget(linkedinHref(r.linkedin_url)) ? (
                      <a
                        href={linkedinHref(r.linkedin_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-xs text-[color:var(--bp-indigo)] hover:underline"
                      >
                        <ExternalLink className="size-3" aria-hidden />
                        LinkedIn profile
                      </a>
                    ) : null}
                    {!isOpen && r.cover_note ? (
                      <p className="mt-2 text-sm text-[color:var(--bp-muted)]">
                        {preview(r.cover_note)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="primary"
                      onClick={() => openCv(r)}
                      disabled={downloading === r.id}
                    >
                      {downloading === r.id ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Download className="size-3.5" aria-hidden />
                      )}
                      {downloading === r.id ? "Opening…" : "Download CV"}
                    </Button>
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent(
                        `Your application to AstroBot Academy${r.job_openings?.title ? ` — ${r.job_openings.title}` : ""}`,
                      )}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--bp-line-strong)] px-2.5 py-1.5 text-xs text-[color:var(--bp-ink-2)] transition hover:border-[color:var(--bp-indigo)] hover:text-[color:var(--bp-indigo)]"
                    >
                      <Mail className="size-3.5" aria-hidden />
                      Reply by email
                    </a>
                    <a
                      href={waLink(r.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--bp-line-strong)] px-2.5 py-1.5 text-xs text-[color:var(--bp-ink-2)] transition hover:border-[color:var(--bp-indigo)] hover:text-[color:var(--bp-indigo)]"
                    >
                      <MessageCircle className="size-3.5" aria-hidden />
                      WhatsApp
                    </a>
                    <SelectInput
                      value={r.status}
                      onChange={(e) => setStatus(r.id, e.target.value as Status)}
                      className="w-40"
                      aria-label={`Status for ${r.full_name}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </SelectInput>
                    <Button variant="ghost" onClick={() => toggleExpand(r)}>
                      {isOpen ? (
                        <>
                          <ChevronUp className="size-3.5" aria-hidden />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3.5" aria-hidden />
                          Expand
                        </>
                      )}
                    </Button>
                    <button
                      type="button"
                      onClick={() => deleteApplication(r.id)}
                      aria-label={`Delete application from ${r.full_name}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--bp-line-strong)] px-2.5 py-1.5 text-xs text-[color:var(--bp-ink-2)] transition hover:border-red-500/60 hover:text-red-500"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <>
                    {r.cv_file_name ? (
                      <p className="mt-3 font-mono text-[11px] text-[color:var(--bp-muted)]">
                        Attached: {r.cv_file_name}
                      </p>
                    ) : null}

                    {r.cover_note ? (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg border border-[color:var(--bp-line)] bg-[color:var(--bp-paper-2)] p-3 text-sm leading-relaxed text-[color:var(--bp-ink)]">
                        {r.cover_note}
                      </p>
                    ) : null}

                    <div className="mt-4">
                      <TextArea
                        rows={2}
                        placeholder="Private notes about this candidate…"
                        aria-label={`Notes about ${r.full_name}`}
                        value={noteDraft[r.id] ?? r.notes ?? ""}
                        onChange={(e) => setNoteDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                      />
                      {noteDraft[r.id] !== undefined && noteDraft[r.id] !== (r.notes ?? "") ? (
                        <div className="mt-2 flex justify-end">
                          <Button variant="primary" onClick={() => saveNote(r.id)}>
                            Save note
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : null}
              </Panel>
            );
          })}
        </div>
      )}

      {totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--bp-ink-2)]">
          <div>
            Showing {pageIndex * PAGE_SIZE + 1}–{Math.min((pageIndex + 1) * PAGE_SIZE, totalCount)}{" "}
            of {totalCount}
            {refreshing ? " · loading…" : ""}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={currentPage === 1 || refreshing}
            >
              ← Prev
            </Button>
            <span className="text-[color:var(--bp-muted)]">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages || refreshing}
            >
              Next →
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
