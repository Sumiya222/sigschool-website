/**
 * Storage quota guard (server-only).
 *
 * There's no WAF in front of this site, so the per-file size cap on public
 * upload buckets (CVs, registration attachments) is the only thing standing
 * between an unauthenticated submitter and unbounded storage growth — a
 * flood of max-size uploads has no other backstop.
 *
 * This is a circuit breaker, not a quota: 5GB is roughly 500 max-size
 * (10MB) files, or realistically several thousand real submissions (actual
 * CVs and attachments run a few hundred KB to a couple of MB each) — far
 * beyond anything a small academy's hiring or camp-registration volume
 * would organically reach, especially with the per-IP and global
 * submission rate limits already bounding how fast the bucket can grow.
 * Tripping it means abuse, not a slow month.
 */
import { BRAND } from "@/lib/brand";

const QUOTA_BYTES = 5 * 1024 * 1024 * 1024; // 5GB
const GB = 1024 * 1024 * 1024;

export const STORAGE_QUOTA_REJECTION_MESSAGE =
  "We're unable to accept file attachments right now due to unusually high demand on our storage. " +
  `Please email your documents to ${BRAND.contactEmail}, or call ${BRAND.phone}, ` +
  "and our team will complete this for you directly.";

/**
 * Supabase has no built-in usage alerting, so this is the only early
 * warning that a bucket is approaching the circuit-breaker cap — without
 * it, the first signal anyone gets is applicants being turned away. Each
 * threshold fires once per crossing (persisted in
 * storage_quota_alert_state, not memory, so it survives a restart or a new
 * isolate) and resets once usage drops back below it, so a later crossing
 * alerts again.
 */
const WARNING_THRESHOLDS_PERCENT = [50, 80] as const;

/**
 * True once a bucket's total stored bytes reach the circuit-breaker
 * threshold. Fails open (returns false) if the size check itself can't be
 * read — a broken read must never turn into a new way to block a real
 * submission — but logs loudly, since a silently-broken guard is worse than
 * no guard at all.
 */
export async function isBucketOverQuota(bucketId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("get_bucket_total_bytes", {
    _bucket_id: bucketId,
  });
  if (error) {
    console.error(
      `[storage-quota] Could not read total size for bucket "${bucketId}" — allowing the upload through:`,
      error.message,
    );
    return false;
  }
  const total = data ?? 0;

  // Best-effort bookkeeping/alerting — must never affect the accept/reject
  // decision below, so its own failures are swallowed here rather than
  // propagated.
  try {
    await checkWarningThresholds(bucketId, total);
  } catch (err) {
    console.error(`[storage-quota] Threshold-alert check failed for bucket "${bucketId}":`, err);
  }

  if (total >= QUOTA_BYTES) {
    console.warn(
      `[storage-quota] Bucket "${bucketId}" is at ${total} bytes, over the ${QUOTA_BYTES}-byte circuit-breaker threshold — rejecting new uploads.`,
    );
    return true;
  }
  return false;
}

async function checkWarningThresholds(bucketId: string, totalBytes: number): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  for (const pct of WARNING_THRESHOLDS_PERCENT) {
    const crossed = totalBytes >= QUOTA_BYTES * (pct / 100);

    if (!crossed) {
      // Reset so a later crossing alerts again. Deleting a row that isn't
      // there is a harmless no-op.
      await supabaseAdmin
        .from("storage_quota_alert_state")
        .delete()
        .eq("bucket_id", bucketId)
        .eq("threshold_percent", pct);
      continue;
    }

    // Insert-first, not check-then-insert: the (bucket_id, threshold_percent)
    // primary key makes this the atomic "claim" for who gets to send the
    // alert, so two concurrent uploads crossing the same threshold at once
    // can't both fire it.
    const { error: claimError } = await supabaseAdmin
      .from("storage_quota_alert_state")
      .insert({ bucket_id: bucketId, threshold_percent: pct });

    if (!claimError) {
      await sendQuotaWarningEmail(bucketId, pct, totalBytes);
    } else if (claimError.code !== "23505") {
      // 23505 = unique_violation — someone else already claimed this
      // crossing; anything else is worth knowing about.
      console.error(
        `[storage-quota] Could not record threshold-alert state for "${bucketId}" at ${pct}%:`,
        claimError.message,
      );
    }
  }
}

async function sendQuotaWarningEmail(
  bucketId: string,
  thresholdPercent: number,
  totalBytes: number,
): Promise<void> {
  const { sendBrandedEmail } = await import("@/lib/email.server");
  const to = process.env.NOTIFY_EMAIL_TO || BRAND.contactEmail;
  const usedGb = (totalBytes / GB).toFixed(2);
  const capGb = (QUOTA_BYTES / GB).toFixed(0);
  const severe = thresholdPercent >= 80;

  // sendBrandedEmail never throws — logs and returns on any send failure or
  // missing SMTP config — so this is a plain fire-and-await, no try/catch
  // needed here.
  await sendBrandedEmail({
    to,
    subject: `Storage warning: "${bucketId}" bucket at ${thresholdPercent}% of its cap`,
    statusLabel: `${thresholdPercent}% OF CAP`,
    statusColor: severe ? "#dc2626" : "#d97706",
    statusBg: severe ? "#fef2f2" : "#fffbeb",
    heading: `"${bucketId}" storage is filling up`,
    intro:
      `The "${bucketId}" upload bucket has reached ${thresholdPercent}% of its ${capGb}GB ` +
      `circuit-breaker cap. New uploads to this bucket are rejected automatically once it ` +
      `reaches the cap — worth checking before that happens.`,
    rows: [
      { label: "Bucket", value: bucketId },
      { label: "Used", value: `${usedGb} GB of ${capGb} GB` },
      { label: "Threshold crossed", value: `${thresholdPercent}%` },
    ],
    footerNote: "Automated storage-quota alert — no reply needed.",
    text:
      `"${bucketId}" storage is at ${thresholdPercent}% of its ${capGb}GB cap (${usedGb} GB used). ` +
      `New uploads are rejected automatically once it reaches the cap.`,
  });
}
