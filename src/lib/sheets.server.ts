/**
 * Google Sheets archive mirror (server-only).
 *
 * Every inquiry and job application is appended to a Google Sheet as a
 * permanent, append-only record. The database stays the primary store; this
 * mirror never edits or deletes rows, so a submission removed from the
 * dashboard still survives here.
 *
 * Auth is via a Google service account (see `google-service-account.server`).
 * The Sheet must be shared with the service account's email as an Editor.
 */
import { getAccessToken, serviceAccountConfig } from "@/lib/google-service-account.server";

const SHEETS_API_URL = "https://sheets.googleapis.com/v4/spreadsheets";

// The Sheets API normally responds in well under a second. 8s is a generous
// multiple of that — enough to absorb real network jitter without ever
// tripping on a healthy call — while still bounding how long a form
// submission can be held open if the endpoint hangs instead of erroring.
// appendRow() can make several of these calls in sequence (ensureTab may
// need to create the tab and its header before the final append), but a
// truly hanging endpoint fails on the first one, which aborts the whole
// chain immediately via the existing try/catch in mirrorToSheet() — so this
// bounds the realistic worst case, not just each individual call.
const FETCH_TIMEOUT_MS = 8_000;

/**
 * The contact page runs three separate inquiry tracks, so each one gets its own
 * tab. The stored queue row always uses the canonical inquiry column order
 * below; each tab then keeps only the columns that track actually collects.
 */
export const INQUIRY_COLUMNS = [
  "Timestamp",
  "Name",
  "Email",
  "Phone",
  "Type",
  "School Name",
  "Role",
  "Message",
  "Submission ID",
];

type InquiryTabSpec = { tab: string; columns: number[] };

const PARENT_LIKE: number[] = [0, 1, 2, 3, 7, 8];

export const INQUIRY_TABS: Record<string, InquiryTabSpec> = {
  Parent: { tab: "Parent Inquiries", columns: PARENT_LIKE },
  School: { tab: "School Inquiries", columns: [0, 1, 2, 3, 5, 6, 7, 8] },
  Other: { tab: "Other Inquiries", columns: PARENT_LIKE },
};

export const APPLICATION_TAB = "Job Applications";

export const APPLICATION_HEADERS = [
  "Timestamp",
  "Full Name",
  "Email",
  "Phone",
  "Position Applied For",
  "LinkedIn/Portfolio URL",
  "Cover Note",
  "CV Filename",
  "Submission ID",
];

export const REGISTRATION_TAB = "Camp Registrations";

/** Attachments (e.g. payment receipts) are recorded by filename only. */
export const REGISTRATION_HEADERS = [
  "Timestamp",
  "Camp",
  "Student Name",
  "Age",
  "Age Track",
  "School",
  "Parent Name",
  "Parent Email",
  "Parent Phone",
  "Status",
  "Media Consent",
  "Medical Notes",
  "Extra Answers",
  "Submission ID",
];

export type SheetTarget = { tab: string; headers: string[]; row: string[] };

/** Route an inquiry row to its track's tab, keeping only that track's columns. */
export function inquiryTarget(row: string[]): SheetTarget {
  const spec = INQUIRY_TABS[row[4]] ?? INQUIRY_TABS.Other;
  return {
    tab: spec.tab,
    headers: spec.columns.map((i) => INQUIRY_COLUMNS[i]),
    row: spec.columns.map((i) => row[i] ?? ""),
  };
}

export function sheetsConfigured(): boolean {
  return serviceAccountConfig() !== null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(path: string, init: RequestInit = {}): Promise<any> {
  const cfg = serviceAccountConfig();
  if (!cfg) throw new Error("Google Sheets connection is not configured.");

  const token = await getAccessToken();
  const res = await fetch(`${SHEETS_API_URL}/${cfg.sheetId}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Sheets API ${path} failed [${res.status}]: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : {};
}

/** Make sure the tab exists and carries a frozen, bold header row. */
async function ensureTab(tab: string, headers: string[]): Promise<void> {
  const meta = await api("?fields=sheets.properties");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = (meta.sheets ?? []).find((s: any) => s.properties?.title === tab);

  let sheetId: number;
  if (!existing) {
    const created = await api(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
    });
    sheetId = created.replies[0].addSheet.properties.sheetId;
  } else {
    sheetId = existing.properties.sheetId;
  }

  const head = await api(`/values/${tab}!A1:Z1`);
  const hasHeader = Array.isArray(head.values) && head.values[0]?.length > 0;
  if (hasHeader) return;

  await api(`/values/${tab}!A1?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [headers] }),
  });
  await api(":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: "userEnteredFormat.textFormat.bold",
          },
        },
      ],
    }),
  });
}

/** Append one row. Throws on failure so the caller can queue a retry. */
export async function appendRow(target: SheetTarget): Promise<void> {
  if (!serviceAccountConfig()) throw new Error("Google Sheets connection is not configured.");
  await ensureTab(target.tab, target.headers);
  await api(`/values/${target.tab}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [target.row] }),
  });
}
