import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getRegistrationFileUrl } from "@/lib/registrations.functions";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { exportCsv as exportCsvRows } from "@/lib/school-export";
import { ChevronDown, ChevronUp, Download, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Button,
  EmptyState,
  ErrorNote,
  LoadingState,
  Panel,
  SelectInput,
  Table,
  Td,
  Th,
  TextInput,
  useToast,
} from "@/components/dashboard/ui";
import {
  AGE_TRACKS,
  REGISTRATION_STATUSES,
  STATUS_LABEL,
  type CustomAnswer,
  type RegistrationStatus,
} from "@/lib/registrations.shared";

type Row = {
  id: string;
  created_at: string;
  camp_name: string;
  student_first_name: string;
  student_last_name: string;
  student_age: number;
  age_track: string;
  student_school: string | null;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  medical_notes: string | null;
  consent_media: boolean;
  custom_answers: CustomAnswer[];
  status: RegistrationStatus;
  /** When an admin first opened this row — distinct from `status`, which is a
   * real confirmed/waitlisted/cancelled decision, not a read flag. */
  opened_at: string | null;
};

const COLUMNS =
  "id, created_at, camp_name, student_first_name, student_last_name, student_age, age_track, student_school, parent_name, parent_email, parent_phone, medical_notes, consent_media, custom_answers, status, opened_at";

// True server-side pagination: each page is fetched with .range() and an
// exact count, so payload size never grows with the table regardless of how
// many pages exist — unlike a single capped fetch, older rows stay reachable
// by paging back instead of falling off a hard ceiling.
const PAGE_SIZE = 25;
// The camp-name filter dropdown needs the set of distinct camps ever used,
// not just what's on the current page. Bounded rather than unlimited so this
// listing query can't grow with the table the way the old full-table fetch
// did — recent camps are what matter for filtering current registrations.
const CAMP_LIST_FETCH_LIMIT = 2000;
// Export batches through the full matching result set in bounded chunks
// rather than one unbounded query, so it can retrieve everything regardless
// of table size without any single request being unbounded.
const EXPORT_CHUNK = 1000;

type Filters = {
  camp: string;
  track: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, f: Filters) {
  let q = query;
  if (f.camp !== "all") q = q.eq("camp_name", f.camp);
  // age_track is stored as "<label> (<min>–<max>)"; the filter dropdown value
  // is just the label, so match it as a prefix rather than an exact value.
  if (f.track !== "all") q = q.like("age_track", `${f.track}%`);
  if (f.status !== "all") q = q.eq("status", f.status);
  if (f.dateFrom) q = q.gte("created_at", `${f.dateFrom}T00:00:00.000Z`);
  if (f.dateTo) q = q.lte("created_at", `${f.dateTo}T23:59:59.999Z`);
  return q;
}

export function RegistrationsPanel() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [camps, setCamps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [camp, setCamp] = useState("all");
  const signFile = useServerFn(getRegistrationFileUrl);

  /** Attachments live in a private bucket — open via a 2-minute signed URL. */
  const openAttachment = useCallback(
    async (registrationId: string, path: string) => {
      const res = await signFile({ data: { registrationId, path } });
      if ("url" in res) window.open(res.url, "_blank", "noopener");
      else setErr(res.error);
    },
    [signFile],
  );

  const [track, setTrack] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const filters: Filters = { camp, track, status, dateFrom, dateTo };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from("registrations" as any) as any)
      .select(COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false });
    query = applyFilters(query, filters);
    const from = pageIndex * PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
    setErr(error ? toSafeErrorMessage(error, "Could not load registrations.") : null);
    setRows(
      ((data ?? []) as Row[]).map((r) => ({
        ...r,
        custom_answers: Array.isArray(r.custom_answers) ? r.custom_answers : [],
      })),
    );
    setTotalCount(count ?? 0);
    setLoading(false);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camp, track, status, dateFrom, dateTo, pageIndex]);

  const loadCamps = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase.from("registrations" as any) as any)
      .select("camp_name")
      .order("created_at", { ascending: false })
      .limit(CAMP_LIST_FETCH_LIMIT);
    const names = Array.from(
      new Set(((data ?? []) as { camp_name: string }[]).map((r) => r.camp_name)),
    ).sort();
    setCamps(names);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void loadCamps();
  }, [loadCamps]);

  useEffect(() => {
    setPageIndex(0);
  }, [camp, track, status, dateFrom, dateTo]);

  /** Opening a registration to read it is what clears "New" — no separate
   * read/unread button to click. Collapsing it back doesn't undo that. It's
   * tracked in its own column rather than `status`, since status here is a
   * real confirmed/waitlisted/cancelled decision an admin makes on purpose. */
  function toggleExpand(row: Row) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
      return next;
    });
    if (!row.opened_at) {
      const now = new Date().toISOString();
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, opened_at: now } : r)));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase.from("registrations" as any) as any)
        .update({ opened_at: now })
        .eq("id", row.id);
    }
  }

  async function deleteRegistration(id: string) {
    if (!confirm("Delete this registration? This cannot be undone.")) return;
    const { error } = await verifyRowsAffected(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("registrations" as any) as any).delete().eq("id", id),
    );
    if (error) {
      toast("Could not delete that registration.", "error");
    } else {
      toast("Registration deleted.");
      // A row on the last page can leave that page short — reload rather
      // than splice locally so the count and page contents stay accurate.
      void refresh();
    }
  }

  async function setRowStatus(row: Row, next: RegistrationStatus) {
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    const { error } = await verifyRowsAffected(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("registrations" as any) as any).update({ status: next }).eq("id", row.id),
    );
    if (error) {
      toast(toSafeErrorMessage(error, "Could not update that registration's status."), "error");
      refresh();
    }
  }

  const filtersActive = Boolean(
    camp !== "all" || track !== "all" || status !== "all" || dateFrom || dateTo,
  );

  /**
   * Exports every registration matching the active filters, not just the
   * current page — fetched in bounded chunks (rather than one unbounded
   * query) so the export stays complete regardless of table size while no
   * single request can return an unbounded result set.
   */
  async function exportCsv() {
    setExporting(true);
    try {
      let all: Row[] = [];
      let offset = 0;

      while (true) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase.from("registrations" as any) as any)
          .select(COLUMNS)
          .order("created_at", { ascending: false });
        query = applyFilters(query, filters);
        const { data, error } = await query.range(offset, offset + EXPORT_CHUNK - 1);
        if (error) {
          toast("Could not export registrations.", "error");
          return;
        }
        const chunk = ((data ?? []) as Row[]).map((r) => ({
          ...r,
          custom_answers: Array.isArray(r.custom_answers) ? r.custom_answers : [],
        }));
        all = all.concat(chunk);
        if (chunk.length < EXPORT_CHUNK) break;
        offset += EXPORT_CHUNK;
      }

      const extraLabels = Array.from(
        new Set(all.flatMap((r) => r.custom_answers.map((a) => a.label))),
      );
      const columns = [
        { header: "Date", key: "date" },
        { header: "Camp", key: "camp" },
        { header: "Student", key: "student" },
        { header: "Age", key: "age" },
        { header: "Track", key: "track" },
        { header: "School", key: "school" },
        { header: "Parent", key: "parent" },
        { header: "Phone", key: "phone" },
        { header: "Email", key: "email" },
        { header: "Medical notes", key: "medical" },
        { header: "Photo consent", key: "consent" },
        { header: "Status", key: "status" },
        ...extraLabels.map((label) => ({ header: label, key: label })),
      ];
      const csvRows = all.map((r) => {
        const byLabel = new Map(r.custom_answers.map((a) => [a.label, a.value]));
        return {
          date: new Date(r.created_at).toLocaleString("en-GB"),
          camp: r.camp_name,
          student: `${r.student_first_name} ${r.student_last_name}`,
          age: r.student_age,
          track: r.age_track,
          school: r.student_school ?? "",
          parent: r.parent_name,
          phone: r.parent_phone,
          email: r.parent_email,
          medical: r.medical_notes ?? "",
          consent: r.consent_media ? "Yes" : "No",
          status: STATUS_LABEL[r.status],
          ...Object.fromEntries(extraLabels.map((label) => [label, byLabel.get(label) ?? ""])),
        };
      });
      exportCsvRows({
        title: filtersActive ? "Camp registrations (filtered)" : "Camp registrations",
        filename: `camp-registrations-${new Date().toISOString().slice(0, 10)}`,
        columns,
        rows: csvRows,
      });
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(pageIndex + 1, totalPages);

  if (loading) return <LoadingState label="Loading registrations…" />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel
        title="Camp registrations"
        hint="Every registration taken through the website, newest first."
        actions={
          <Button
            icon={<Download className="size-3.5" />}
            onClick={exportCsv}
            disabled={totalCount === 0 || exporting}
          >
            {exporting ? "Exporting…" : filtersActive ? "Export filtered results" : "Export CSV"}
          </Button>
        }
      >
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <SelectInput
            className="max-w-[220px]"
            value={camp}
            onChange={(e) => setCamp(e.target.value)}
          >
            <option value="all">All camps</option>
            {camps.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            className="max-w-[220px]"
            value={track}
            onChange={(e) => setTrack(e.target.value)}
          >
            <option value="all">All age tracks</option>
            {AGE_TRACKS.map((t) => (
              <option key={t.id} value={t.label}>
                {t.label}
              </option>
            ))}
          </SelectInput>
          <SelectInput
            className="max-w-[200px]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {REGISTRATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </SelectInput>
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

        {rows.length === 0 ? (
          <EmptyState
            title="No registrations to show"
            description="Registrations taken through the camp form on the website appear here."
          />
        ) : (
          <Table minWidth={1260}>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Student</Th>
                <Th>Age / track</Th>
                <Th>School</Th>
                <Th>Parent</Th>
                <Th>Contact</Th>
                <Th>Notes & answers</Th>
                <Th>Consent</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = expanded.has(r.id);
                const detailCount = r.custom_answers.length + (r.medical_notes ? 1 : 0);
                return (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("en-GB")}
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--bp-muted)]">
                        {r.camp_name}
                      </span>
                      {!r.opened_at ? (
                        <span className="mt-1 inline-block rounded-full bg-[color:var(--bp-indigo)]/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[color:var(--bp-indigo)]">
                          New
                        </span>
                      ) : null}
                    </Td>
                    <Td>
                      {r.student_first_name} {r.student_last_name}
                    </Td>
                    <Td>
                      {r.student_age}
                      <span className="mt-0.5 block text-[11px] text-[color:var(--bp-muted)]">
                        {r.age_track}
                      </span>
                    </Td>
                    <Td>{r.student_school ?? "—"}</Td>
                    <Td>{r.parent_name}</Td>
                    <Td>
                      <a className="text-[color:var(--bp-indigo)]" href={`tel:${r.parent_phone}`}>
                        {r.parent_phone}
                      </a>
                      <a
                        className="mt-0.5 block truncate text-[11px] text-[color:var(--bp-muted)]"
                        href={`mailto:${r.parent_email}`}
                      >
                        {r.parent_email}
                      </a>
                    </Td>
                    <Td className="max-w-[280px]">
                      {isOpen ? (
                        <>
                          {r.medical_notes ? (
                            <p className="text-[12px] text-[color:var(--bp-ink-2)]">
                              {r.medical_notes}
                            </p>
                          ) : null}
                          {r.custom_answers.map((a) => (
                            <p
                              key={a.field_id}
                              className="mt-1 text-[12px] text-[color:var(--bp-ink-2)]"
                            >
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--bp-muted)]">
                                {a.label}:
                              </span>{" "}
                              {a.storage_path ? (
                                <button
                                  type="button"
                                  onClick={() => void openAttachment(r.id, a.storage_path!)}
                                  className="underline decoration-dotted underline-offset-2 hover:text-[color:var(--bp-accent)]"
                                >
                                  {a.value || "Download file"}
                                </button>
                              ) : (
                                a.value
                              )}
                            </p>
                          ))}
                          {detailCount === 0 ? "—" : null}
                        </>
                      ) : (
                        <span className="text-[12px] text-[color:var(--bp-muted)]">
                          {detailCount > 0
                            ? `${detailCount} detail${detailCount === 1 ? "" : "s"} — expand to view`
                            : "—"}
                        </span>
                      )}
                    </Td>
                    <Td>{r.consent_media ? "Photos OK" : "No photos"}</Td>
                    <Td>
                      <SelectInput
                        className="min-w-[140px]"
                        value={r.status}
                        onChange={(e) => setRowStatus(r, e.target.value as RegistrationStatus)}
                      >
                        {REGISTRATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </SelectInput>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(r)}
                          aria-label={isOpen ? "Collapse" : "Expand"}
                          className="inline-flex items-center gap-1 rounded-md border border-[color:var(--bp-line-strong)] px-2 py-1 text-xs text-[color:var(--bp-ink-2)] transition hover:border-[color:var(--bp-indigo)] hover:text-[color:var(--bp-indigo)]"
                        >
                          {isOpen ? (
                            <ChevronUp className="size-3.5" aria-hidden />
                          ) : (
                            <ChevronDown className="size-3.5" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRegistration(r.id)}
                          aria-label={`Delete registration for ${r.student_first_name} ${r.student_last_name}`}
                          className="inline-flex items-center rounded-md border border-[color:var(--bp-line-strong)] px-2 py-1 text-xs text-[color:var(--bp-ink-2)] transition hover:border-red-500/60 hover:text-red-500"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}

        {totalCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[color:var(--bp-ink-2)]">
            <div>
              Showing {pageIndex * PAGE_SIZE + 1}–
              {Math.min((pageIndex + 1) * PAGE_SIZE, totalCount)} of {totalCount}
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
      </Panel>
    </div>
  );
}
