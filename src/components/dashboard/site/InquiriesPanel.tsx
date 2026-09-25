import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Mail, MessageCircle, RotateCcw, Trash2 } from "lucide-react";
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
  TextInput,
  useToast,
  cx,
} from "@/components/dashboard/ui";

type InquiryType = "parent" | "school" | "other";
type InquiryStatus = "new" | "handled";

interface Row {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  type: InquiryType;
  school_name: string | null;
  role: string | null;
  message: string;
  details: Record<string, string> | null;
  status: InquiryStatus;
}

const TYPE_LABEL: Record<InquiryType, string> = {
  parent: "Parent",
  school: "School",
  other: "Other",
};

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Preview shown in the collapsed card — the full message is fetched with the
 * row and shown in full on expand; this just keeps the collapsed view from
 * rendering a multi-thousand-character block for every row on the page. */
function preview(text: string, max = 160): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

const COLUMNS =
  "id, created_at, full_name, email, phone, type, school_name, role, message, details, status";

// True server-side pagination: each page is fetched with .range() and an
// exact count, so payload size never grows with the table regardless of how
// many pages exist — unlike a single capped fetch, older rows stay reachable
// by paging back instead of falling off a hard ceiling.
const PAGE_SIZE = 25;

export function InquiriesPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | InquiryType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | InquiryStatus>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pageIndex, setPageIndex] = useState(0);

  const load = useCallback(async () => {
    setRefreshing(true);
    let query = supabase
      .from("inquiries")
      .select(COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false });
    if (typeFilter !== "all") query = query.eq("type", typeFilter);
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (dateFrom) query = query.gte("created_at", `${dateFrom}T00:00:00.000Z`);
    if (dateTo) query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
    const from = pageIndex * PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) setErr(toSafeErrorMessage(error, "Could not load inquiries."));
    else {
      setErr(null);
      setRows((data ?? []) as Row[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
    setRefreshing(false);
  }, [typeFilter, statusFilter, dateFrom, dateTo, pageIndex]);

  const refreshNewCount = useCallback(async () => {
    const { count } = await supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    setNewCount(count ?? 0);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void refreshNewCount();
  }, [refreshNewCount]);

  useEffect(() => {
    setPageIndex(0);
  }, [typeFilter, statusFilter, dateFrom, dateTo]);

  async function setStatus(id: string, status: InquiryStatus) {
    const previous = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
    const { error } = await verifyRowsAffected(
      supabase.from("inquiries").update({ status }).eq("id", id),
    );
    if (error) {
      setRows(previous);
      toast("Could not update that inquiry.", "error");
    } else {
      void refreshNewCount();
    }
  }

  /** Opening an inquiry to read it is what clears the "new" flag — no separate
   * read/unread button to click. Collapsing it back doesn't undo that. */
  function toggleExpand(r: Row) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(r.id)) next.delete(r.id);
      else next.add(r.id);
      return next;
    });
    if (r.status === "new") void setStatus(r.id, "handled");
  }

  async function deleteInquiry(id: string) {
    if (!confirm("Delete this inquiry? This cannot be undone.")) return;
    const { error } = await verifyRowsAffected(supabase.from("inquiries").delete().eq("id", id));
    if (error) {
      toast("Could not delete that inquiry.", "error");
    } else {
      toast("Inquiry deleted.");
      void refreshNewCount();
      // A row on the last page can leave that page short — reload rather
      // than splice locally so the count and page contents stay accurate.
      void load();
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(pageIndex + 1, totalPages);

  if (loading) return <LoadingState label="Loading inquiries…" />;
  if (err) return <ErrorNote>{err}</ErrorNote>;

  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-[color:var(--bp-ink-2)]">
              {totalCount} message{totalCount === 1 ? "" : "s"} matching these filters · {newCount}{" "}
              awaiting a reply overall
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[color:var(--bp-ink-2)]">
              Type
              <SelectInput
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="w-40"
              >
                <option value="all">All</option>
                <option value="parent">Parent</option>
                <option value="school">School</option>
                <option value="other">Other</option>
              </SelectInput>
            </label>
            <label className="flex items-center gap-2 text-xs text-[color:var(--bp-ink-2)]">
              Status
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-36"
              >
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="handled">Handled</option>
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
          title="Nothing here yet"
          description="Messages sent through the website contact form will appear in this list."
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
                          r.type === "school"
                            ? "border-[color:var(--bp-indigo)]/50 text-[color:var(--bp-indigo)]"
                            : "border-[color:var(--bp-line-strong)] text-[color:var(--bp-ink-2)]",
                        )}
                      >
                        {TYPE_LABEL[r.type]}
                      </span>
                      {r.status === "new" ? (
                        <span className="rounded-full bg-[color:var(--bp-indigo)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--bp-indigo)]">
                          New
                        </span>
                      ) : (
                        <span className="rounded-full border border-[color:var(--bp-line-strong)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--bp-muted)]">
                          Handled
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--bp-muted)]">
                      {formatDate(r.created_at)}
                    </p>
                    <p className="mt-2 text-sm text-[color:var(--bp-ink-2)]">
                      {r.email} · {r.phone}
                      {r.school_name ? ` · ${r.school_name}` : ""}
                      {r.role ? ` (${r.role})` : ""}
                    </p>
                    {!isOpen ? (
                      <p className="mt-2 text-sm text-[color:var(--bp-muted)]">
                        {preview(r.message)}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent("Re: your inquiry to AstroBot Academy")}`}
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
                      Open WhatsApp
                    </a>
                    {r.status === "handled" ? (
                      <Button variant="ghost" onClick={() => setStatus(r.id, "new")}>
                        <RotateCcw className="size-3.5" aria-hidden />
                        Reopen
                      </Button>
                    ) : null}
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
                      onClick={() => deleteInquiry(r.id)}
                      aria-label={`Delete inquiry from ${r.full_name}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--bp-line-strong)] px-2.5 py-1.5 text-xs text-[color:var(--bp-ink-2)] transition hover:border-red-500/60 hover:text-red-500"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <>
                    {r.details && Object.keys(r.details).length > 0 ? (
                      <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                        {Object.entries(r.details).map(([k, v]) => (
                          <div
                            key={k}
                            className="rounded-lg border border-[color:var(--bp-line)] bg-[color:var(--bp-paper-2)] px-3 py-2"
                          >
                            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--bp-muted)]">
                              {k}
                            </dt>
                            <dd className="mt-0.5 text-sm text-[color:var(--bp-ink)]">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}

                    <p className="mt-4 whitespace-pre-wrap rounded-lg border border-[color:var(--bp-line)] bg-[color:var(--bp-paper-2)] p-3 text-sm leading-relaxed text-[color:var(--bp-ink)]">
                      {r.message}
                    </p>
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
