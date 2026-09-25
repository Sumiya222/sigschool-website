/**
 * Queue + dispatcher for the Google Sheet archive.
 *
 * Submissions are written to the database first. The Sheet write is attempted
 * afterwards and can never fail a submission: every row is recorded in
 * `sheet_sync_queue` first, so a failed write stays visible to admins and can
 * be retried instead of being silently dropped.
 */

import {
  APPLICATION_HEADERS,
  APPLICATION_TAB,
  REGISTRATION_HEADERS,
  REGISTRATION_TAB,
  appendRow,
  inquiryTarget,
  sheetsConfigured,
  type SheetTarget,
} from "@/lib/sheets.server";
import { sanitizeCell } from "@/lib/sanitize-cell";

/**
 * Defuses spreadsheet formulas before a row reaches Google Sheets. This is
 * the highest-priority sanitizing point in the app: Sheets supports
 * IMPORTXML/IMPORTDATA/IMAGE, so a formula planted here can exfiltrate
 * neighboring cells (names, ages, medical notes, phone numbers) to an
 * external URL the moment anyone opens the archive — and it runs
 * automatically on every submission, with no export click required.
 */
function cell(v: unknown): string {
  return String(sanitizeCell(v) ?? "");
}

export type SyncSource = "inquiries" | "job_applications" | "registrations";

/** Payload shape stored on the queue row — already flattened to Sheet columns. */
export type QueuePayload = { row: string[] };

const MAX_ATTEMPTS = 5;

function targetFor(source: SyncSource, row: string[]): SheetTarget {
  if (source === "inquiries") return inquiryTarget(row);
  if (source === "registrations")
    return { tab: REGISTRATION_TAB, headers: REGISTRATION_HEADERS, row };
  return { tab: APPLICATION_TAB, headers: APPLICATION_HEADERS, row };
}

export function registrationRow(input: {
  id: string;
  created_at: string;
  camp_name: string;
  student_name: string;
  student_age: number;
  age_track: string;
  student_school?: string | null;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  status: string;
  consent_media: boolean;
  medical_notes?: string | null;
  /** Files are summarised by name only — uploads stay in the private bucket. */
  custom_answers: { label: string; value: string }[];
}): string[] {
  return [
    input.created_at,
    input.camp_name,
    input.student_name,
    String(input.student_age),
    input.age_track,
    input.student_school ?? "",
    input.parent_name,
    input.parent_email,
    input.parent_phone,
    input.status,
    input.consent_media ? "Yes" : "No",
    input.medical_notes ?? "",
    input.custom_answers.map((a) => `${a.label}: ${a.value}`).join("\n"),
    input.id,
  ].map(cell);
}

export function inquiryRow(input: {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  type: string;
  school_name?: string | null;
  role?: string | null;
  message: string;
}): string[] {
  const label = input.type === "parent" ? "Parent" : input.type === "school" ? "School" : "Other";
  return [
    input.created_at,
    input.full_name,
    input.email,
    input.phone,
    label,
    input.school_name ?? "",
    input.role ?? "",
    input.message,
    input.id,
  ].map(cell);
}

export function applicationRow(input: {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url?: string | null;
  cover_note?: string | null;
  cv_file_name?: string | null;
}): string[] {
  // Deliberately filename only — never a link to the CV. CVs stay private.
  return [
    input.created_at,
    input.full_name,
    input.email,
    input.phone,
    input.position,
    input.linkedin_url ?? "",
    input.cover_note ?? "",
    input.cv_file_name ?? "",
    input.id,
  ].map(cell);
}

/**
 * Record the row, then try to write it. Never throws — the caller's submission
 * has already succeeded by this point.
 */
export async function mirrorToSheet(
  source: SyncSource,
  recordId: string,
  row: string[],
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("sheet_sync_queue")
      .upsert(
        { source_table: source, record_id: recordId, payload: { row }, status: "pending" },
        { onConflict: "source_table,record_id", ignoreDuplicates: true },
      );

    if (!sheetsConfigured()) {
      await supabaseAdmin
        .from("sheet_sync_queue")
        .update({ last_error: "Google Sheets credentials are not configured." })
        .eq("source_table", source)
        .eq("record_id", recordId);
      return;
    }

    try {
      await appendRow(targetFor(source, row));
      await supabaseAdmin
        .from("sheet_sync_queue")
        .update({
          status: "synced",
          synced_at: new Date().toISOString(),
          attempts: 1,
          last_error: null,
        })
        .eq("source_table", source)
        .eq("record_id", recordId);
    } catch (err) {
      console.error("sheet mirror failed", source, recordId, err);
      await supabaseAdmin
        .from("sheet_sync_queue")
        .update({ attempts: 1, last_error: String((err as Error)?.message ?? err).slice(0, 800) })
        .eq("source_table", source)
        .eq("record_id", recordId);
    }
  } catch (err) {
    // Absolutely never surface this to the visitor.
    console.error("sheet mirror bookkeeping failed", err);
  }
}

export type RetryResult = { attempted: number; synced: number; failed: number };

/** Retry every pending row, oldest first. Rows past MAX_ATTEMPTS are marked failed. */
export async function retryPending(limit = 25): Promise<RetryResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("sheet_sync_queue")
    .select("id, source_table, record_id, payload, attempts")
    .eq("status", "pending")
    .order("created_at")
    .limit(limit);

  const rows = data ?? [];
  let synced = 0;
  let failed = 0;

  for (const item of rows) {
    const payload = (item.payload ?? {}) as Partial<QueuePayload>;
    const row = Array.isArray(payload.row) ? payload.row.map(String) : null;
    const attempts = (item.attempts ?? 0) + 1;

    if (!row) {
      await supabaseAdmin
        .from("sheet_sync_queue")
        .update({ status: "failed", attempts, last_error: "Stored row data is unreadable." })
        .eq("id", item.id);
      failed += 1;
      continue;
    }

    try {
      await appendRow(targetFor(item.source_table as SyncSource, row));
      await supabaseAdmin
        .from("sheet_sync_queue")
        .update({
          status: "synced",
          synced_at: new Date().toISOString(),
          attempts,
          last_error: null,
        })
        .eq("id", item.id);
      synced += 1;
    } catch (err) {
      const message = String((err as Error)?.message ?? err).slice(0, 800);
      const permanent = attempts >= MAX_ATTEMPTS;
      await supabaseAdmin
        .from("sheet_sync_queue")
        .update({ status: permanent ? "failed" : "pending", attempts, last_error: message })
        .eq("id", item.id);
      if (permanent) failed += 1;
    }
  }

  return { attempted: rows.length, synced, failed };
}
