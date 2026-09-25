import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { INSTITUTIONAL_ATTRIBUTION } from "@/lib/institutional";
import { sanitizeCell } from "@/lib/sanitize-cell";
import { sanitizeForPdf } from "@/lib/sanitize-pdf-text";
import astrobotLogo from "@/assets/astrobot-logo-dark.png";

type LoadedLogo = { data: string; w: number; h: number };
let logoPromise: Promise<LoadedLogo | null> | undefined;
function loadLogo(): Promise<LoadedLogo | null> {
  if (logoPromise) return logoPromise;
  logoPromise = (async () => {
    try {
      const res = await fetch(astrobotLogo);
      const blob = await res.blob();
      const data: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = data;
      });
      return { data, w: img.width, h: img.height };
    } catch {
      return null;
    }
  })();
  return logoPromise;
}

/**
 * Draws the AstroBot logo in the top-right corner of the current page.
 * Unit-agnostic (works with pt or mm jsPDF documents). Target height ~32pt.
 */
export async function drawLogoHeader(doc: jsPDF, marginPt = 40) {
  const logo = await loadLogo();
  if (!logo) return;
  const sf = doc.internal.scaleFactor; // points per unit
  const targetH = 32 / sf;
  const targetW = targetH * (logo.w / logo.h);
  const pageW = doc.internal.pageSize.getWidth();
  const marginRight = marginPt / sf;
  const top = 16 / sf;
  const x = pageW - marginRight - targetW;
  doc.addImage(logo.data, "PNG", x, top, targetW, targetH, undefined, "FAST");
}

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportPayload {
  title: string; // e.g. "AstroBot — Section Result Card"
  subtitle?: string; // e.g. "School X · Grade 3 · Section A · Fall 2026"
  filename: string; // no extension
  columns: ExportColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
}

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv(p: ExportPayload) {
  const esc = (v: unknown) => {
    const raw = sanitizeCell(v);
    const s = raw == null ? "" : String(raw);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    p.columns.map((c) => esc(c.header)).join(","),
    ...p.rows.map((r) => p.columns.map((c) => esc(r[c.key])).join(",")),
  ];
  trigger(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${p.filename}.csv`);
}

export function exportXlsx(p: ExportPayload) {
  const headers = p.columns.map((c) => c.header);
  const data = p.rows.map((r) => p.columns.map((c) => sanitizeCell(r[c.key]) ?? ""));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  ws["!cols"] = p.columns.map((c) => ({ wch: c.width ?? Math.max(12, c.header.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  trigger(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `${p.filename}.xlsx`,
  );
}

export async function exportPdf(p: ExportPayload) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  await drawLogoHeader(doc);
  doc.setFontSize(14);
  doc.text(sanitizeForPdf(p.title), 40, 40);
  if (p.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(sanitizeForPdf(p.subtitle), 40, 58);
    doc.setTextColor(0);
  }
  autoTable(doc, {
    startY: p.subtitle ? 74 : 58,
    head: [p.columns.map((c) => sanitizeForPdf(c.header))],
    body: p.rows.map((r) => p.columns.map((c) => sanitizeForPdf((r[c.key] ?? "").toString()))),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: "grid",
  });
  drawInstitutionalFooter(doc);
  doc.save(`${p.filename}.pdf`);
}

/**
 * Draws the shared institutional attribution line at the bottom of every page
 * of the given jsPDF document. Small, muted, centered.
 */
export function drawInstitutionalFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(INSTITUTIONAL_ATTRIBUTION, pageW / 2, pageH - 18, { align: "center" });
  }
  doc.setTextColor(0, 0, 0);
}
