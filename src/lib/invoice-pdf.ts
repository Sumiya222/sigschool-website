import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INSTITUTIONAL_ATTRIBUTION } from "@/lib/institutional";
import { sanitizeForPdf } from "@/lib/sanitize-pdf-text";
import { BRAND } from "@/lib/brand";

export interface InvoicePdfData {
  invoice_number: string;
  generated_at: string; // ISO
  due_date: string; // YYYY-MM-DD
  billing_month: string; // YYYY-MM
  school_name: string;
  school_address: string | null;
  project_start_date: string | null;
  active_student_count: number;
  rate_per_student: number;
  /** Arrears-inclusive grand total — the one authoritative figure. Never
   * recompute this from active_student_count * rate_per_student; that
   * product is the tuition line's own amount only. */
  total_amount: number;
  arrears_amount: number;
  arrears_note?: string | null;
  amount_paid: number;
  remaining_balance: number;
  notes?: string | null;
  company: {
    bank_name: string | null;
    account_title: string | null;
    account_number: string | null;
    iban: string | null;
  };
}

const NOTES_TEXT = `This invoice is based on the service agreement terms. Payments are due as per the schedule, exclusive of applicable taxes. For any queries or payment details, please contact ${BRAND.phone}.`;

export const CONTACT = {
  website: BRAND.domain,
  phone: BRAND.phone,
  email: BRAND.contactEmail,
  address: BRAND.addressLine,
};

// Brand palette
const INK: [number, number, number] = [17, 24, 39]; // near-black
const MUTED: [number, number, number] = [107, 114, 128]; // gray-500
const LINE: [number, number, number] = [229, 231, 235]; // gray-200
const ACCENT: [number, number, number] = [79, 70, 229]; // indigo-600
const ACCENT_SOFT: [number, number, number] = [238, 236, 254]; // indigo-50-ish

export function formatPKR(n: number): string {
  return (
    "PKR " +
    (n ?? 0).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const _MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mmm = _MONTHS_SHORT[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd} ${mmm} ${yyyy}`;
}

export function formatBillingMonth(ym: string): string {
  const [y, m] = ym.split("-").map((v) => parseInt(v, 10));
  if (!y || !m) return ym;
  return `${_MONTHS_SHORT[m - 1]} ${y}`;
}

function setFill(doc: jsPDF, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setText(doc: jsPDF, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

export async function generateInvoicePdf(rawInv: InvoicePdfData): Promise<void> {
  // Sanitize every free-text field once, up front, so no call site below can
  // forget it and re-introduce the encoding-corruption bug.
  const inv: InvoicePdfData = {
    ...rawInv,
    school_name: sanitizeForPdf(rawInv.school_name),
    school_address: rawInv.school_address
      ? sanitizeForPdf(rawInv.school_address)
      : rawInv.school_address,
    notes: rawInv.notes ? sanitizeForPdf(rawInv.notes) : rawInv.notes,
    arrears_note: rawInv.arrears_note ? sanitizeForPdf(rawInv.arrears_note) : rawInv.arrears_note,
    company: {
      bank_name: rawInv.company.bank_name
        ? sanitizeForPdf(rawInv.company.bank_name)
        : rawInv.company.bank_name,
      account_title: rawInv.company.account_title
        ? sanitizeForPdf(rawInv.company.account_title)
        : rawInv.company.account_title,
      account_number: rawInv.company.account_number
        ? sanitizeForPdf(rawInv.company.account_number)
        : rawInv.company.account_number,
      iban: rawInv.company.iban ? sanitizeForPdf(rawInv.company.iban) : rawInv.company.iban,
    },
  };

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 48; // page margin

  // ============ HEADER BAND ============
  const headerH = 96;
  setFill(doc, [255, 255, 255]);
  doc.rect(0, 0, pageW, headerH, "F");
  // thin accent strip at bottom of header
  setFill(doc, ACCENT);
  doc.rect(0, headerH, pageW, 3, "F");

  // Wordmark (left) — text-only, no raster logo asset for the placeholder brand.
  const logoY = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setText(doc, INK);
  doc.text(BRAND.name.toUpperCase(), M, logoY + 30);

  // "INVOICE" (right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  setText(doc, INK);
  doc.text("INVOICE", pageW - M, logoY + 22, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, MUTED);
  doc.text(`#${inv.invoice_number}`, pageW - M, logoY + 38, { align: "right" });

  // ============ META BAR (invoice date / due date / billing month) ============
  const metaY = headerH + 24;
  const metaBoxes: Array<[string, string]> = [
    ["ISSUED", formatDate(inv.generated_at)],
    ["DUE", formatDate(inv.due_date)],
    ["BILLING", formatBillingMonth(inv.billing_month)],
  ];
  const boxW = (pageW - M * 2 - 16) / 3;
  metaBoxes.forEach(([label, value], i) => {
    const x = M + i * (boxW + 8);
    setDraw(doc, LINE);
    doc.setLineWidth(0.75);
    doc.roundedRect(x, metaY, boxW, 44, 4, 4, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(doc, MUTED);
    doc.text(label, x + 10, metaY + 15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, INK);
    doc.text(value, x + 10, metaY + 32);
  });

  // ============ BILL TO / BANK DETAILS ============
  const partiesY = metaY + 44 + 26;
  const colW = (pageW - M * 2 - 20) / 2;

  // Left: Bill To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, ACCENT);
  doc.text("BILL TO", M, partiesY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setText(doc, INK);
  doc.text(inv.school_name, M, partiesY + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, MUTED);
  let ly = partiesY + 34;
  if (inv.school_address) {
    const lines = doc.splitTextToSize(inv.school_address, colW - 8);
    doc.text(lines, M, ly);
    ly += 12 * lines.length;
  }
  if (inv.project_start_date) {
    doc.text(`Project start: ${formatDate(inv.project_start_date)}`, M, ly);
    ly += 12;
  }

  // Right: Pay To (bank details)
  const rx = M + colW + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, ACCENT);
  doc.text("PAY TO", rx, partiesY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setText(doc, INK);
  let ry = partiesY + 18;
  const bank = inv.company;
  const bankLines: Array<[string, string | null]> = [
    ["Bank", bank.bank_name],
    ["Account title", bank.account_title],
    ["Account #", bank.account_number],
    ["IBAN", bank.iban],
  ];
  bankLines.forEach(([k, v]) => {
    if (!v) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, MUTED);
    doc.text(k, rx, ry);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(doc, INK);
    doc.text(v, rx + 68, ry);
    ry += 15;
  });

  const partiesBottom = Math.max(ly, ry) + 16;

  // ============ LINE ITEM TABLE ============
  // Tuition is its own line-item amount (qty × rate) -- inv.total_amount is
  // the arrears-inclusive grand total, shown separately below and in the
  // totals block, never on this row.
  const tuitionAmount = inv.active_student_count * inv.rate_per_student;
  const lineItems: string[][] = [
    [
      `Monthly tuition — ${formatBillingMonth(inv.billing_month)}\nActive enrolled students`,
      String(inv.active_student_count),
      formatPKR(inv.rate_per_student),
      formatPKR(tuitionAmount),
    ],
  ];
  if (inv.arrears_amount > 0) {
    lineItems.push([
      `Arrears${inv.arrears_note ? `\n${inv.arrears_note}` : ""}`,
      "—",
      "—",
      formatPKR(inv.arrears_amount),
    ]);
  }
  autoTable(doc, {
    startY: partiesBottom,
    margin: { left: M, right: M },
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: lineItems,
    theme: "plain",
    styles: {
      fontSize: 10,
      textColor: INK,
      cellPadding: { top: 12, right: 10, bottom: 12, left: 10 },
      lineColor: LINE,
      lineWidth: 0,
    },
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: MUTED,
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 8, right: 10, bottom: 8, left: 10 },
      lineColor: LINE,
      lineWidth: { bottom: 0.75 },
    },
    bodyStyles: {
      lineColor: LINE,
      lineWidth: { bottom: 0.5 },
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "center", cellWidth: 60 },
      2: { halign: "right", cellWidth: 110 },
      3: { halign: "right", cellWidth: 110, fontStyle: "bold" },
    },
  });

  const afterTableY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // ============ TOTALS BLOCK (right column) ============
  const totalsW = 240;
  const totalsX = pageW - M - totalsW;
  let ty = afterTableY;

  const rowH = 20;
  const drawTotalRow = (
    label: string,
    value: string,
    opts?: { bold?: boolean; muted?: boolean },
  ) => {
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    doc.setFontSize(10);
    setText(doc, opts?.muted ? MUTED : INK);
    doc.text(label, totalsX, ty + 13);
    doc.text(value, totalsX + totalsW, ty + 13, { align: "right" });
    ty += rowH;
  };
  drawTotalRow("Subtotal", formatPKR(inv.total_amount), { muted: true });
  drawTotalRow("Amount paid", formatPKR(inv.amount_paid), { muted: true });

  // Separator
  setDraw(doc, LINE);
  doc.setLineWidth(0.75);
  doc.line(totalsX, ty + 2, totalsX + totalsW, ty + 2);
  ty += 8;

  // Balance due — highlight bar
  setFill(doc, ACCENT_SOFT);
  doc.roundedRect(totalsX, ty, totalsW, 34, 4, 4, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(doc, ACCENT);
  doc.text("BALANCE DUE", totalsX + 12, ty + 22);
  doc.setFontSize(13);
  setText(doc, INK);
  doc.text(formatPKR(inv.remaining_balance), totalsX + totalsW - 12, ty + 22, {
    align: "right",
  });
  ty += 34;

  // ============ NOTES (left column, aligned with totals top) ============
  const noteX = M;
  const noteMaxW = totalsX - M - 20;
  const noteY = afterTableY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, ACCENT);
  doc.text("NOTES", noteX, noteY + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setText(doc, MUTED);
  const noteBody = inv.notes && inv.notes.trim().length > 0 ? inv.notes : NOTES_TEXT;
  const noteLines = doc.splitTextToSize(noteBody, noteMaxW);
  doc.text(noteLines, noteX, noteY + 26);

  // ============ THANK YOU LINE ============
  const thanksY = Math.max(ty + 30, noteY + 26 + noteLines.length * 11 + 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(doc, INK);
  doc.text(`Thank you for partnering with ${BRAND.name}.`, M, thanksY);

  // ============ FOOTER ============
  const footerY = pageH - 48;
  setDraw(doc, LINE);
  doc.setLineWidth(0.75);
  doc.line(M, footerY - 16, pageW - M, footerY - 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setText(doc, MUTED);
  const footerText = `${CONTACT.website}    ·    ${CONTACT.email}    ·    ${CONTACT.phone}`;
  doc.text(footerText, pageW / 2, footerY, { align: "center" });
  doc.setFontSize(7.5);
  doc.text(
    `Invoice ${inv.invoice_number} · Generated ${formatDate(inv.generated_at)}`,
    pageW / 2,
    footerY + 14,
    { align: "center" },
  );
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(INSTITUTIONAL_ATTRIBUTION, pageW / 2, footerY + 26, { align: "center" });

  doc.save(`${inv.invoice_number}.pdf`);
}
