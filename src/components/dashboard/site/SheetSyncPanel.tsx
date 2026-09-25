import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSheetSyncHealth, retrySheetSync } from "@/lib/sheet-sync.functions";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import {
  Button,
  EmptyState,
  ErrorNote,
  LoadingState,
  Panel,
  useToast,
  cx,
} from "@/components/dashboard/ui";

interface Row {
  id: string;
  source_table: string;
  record_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  synced_at: string | null;
}

const SOURCE_LABEL: Record<string, string> = {
  inquiries: "Inquiry",
  job_applications: "Job application",
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

export function SheetSyncPanel() {
  const toast = useToast();
  const retry = useServerFn(retrySheetSync);
  const health = useServerFn(getSheetSyncHealth);

  const [rows, setRows] = useState<Row[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sheet_sync_queue")
      .select("id, source_table, record_id, status, attempts, last_error, created_at, synced_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) setErr(toSafeErrorMessage(error, "Could not load the sync queue."));
    else {
      setErr(null);
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void health({}).then((r: any) => setConfigured(Boolean(r?.configured)));
  }, [load, health]);

  const outstanding = rows.filter((r) => r.status !== "synced");

  async function onRetry() {
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await retry({});
      if (result?.error) toast(result.error, "error");
      else toast(`Retried ${result.attempted} — ${result.synced} written to the Sheet.`, "success");
      await load();
    } catch {
      toast("The retry could not be completed.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading Sheet archive status" />;

  return (
    <div className="space-y-5">
      {configured === false ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          <p className="text-[13px] text-[color:var(--bp-ink-2)]">
            The Google Sheet archive is not connected yet. Submissions are still saved safely to the
            database and queued here — they will be written to the Sheet once the service account
            credentials and Sheet ID are added.
          </p>
        </div>
      ) : null}

      <Panel
        title="Sheet archive"
        hint="Every submission is mirrored to the Google Sheet as a permanent, append-only record. Deleting or re-statusing a submission here never changes the Sheet."
        actions={
          <Button onClick={onRetry} disabled={busy || outstanding.length === 0} variant="secondary">
            <RotateCcw className="size-3.5" aria-hidden />
            {busy ? "Retrying" : `Retry outstanding (${outstanding.length})`}
          </Button>
        }
      >
        {err ? <ErrorNote>{err}</ErrorNote> : null}
        {rows.length === 0 ? (
          <EmptyState
            title="Nothing archived yet"
            description="Rows appear here as submissions come in."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--bp-ink-3)]">
                  <th className="px-3 py-2 font-medium">Received</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Attempts</th>
                  <th className="px-3 py-2 font-medium">Last error</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-[color:var(--bp-line)] align-top">
                    <td className="whitespace-nowrap px-3 py-2.5">{formatDate(r.created_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {SOURCE_LABEL[r.source_table] ?? r.source_table}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cx(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          r.status === "synced"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : r.status === "failed"
                              ? "bg-red-500/15 text-red-500"
                              : "bg-amber-500/15 text-amber-500",
                        )}
                      >
                        {r.status === "synced" ? (
                          <CheckCircle2 className="size-3" aria-hidden />
                        ) : null}
                        {r.status === "synced"
                          ? "In Sheet"
                          : r.status === "failed"
                            ? "Failed"
                            : "Pending"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{r.attempts}</td>
                    <td className="max-w-[380px] px-3 py-2.5 text-[color:var(--bp-ink-3)]">
                      {r.last_error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
