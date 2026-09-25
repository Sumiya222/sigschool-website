import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawLogoHeader, drawInstitutionalFooter } from "@/lib/school-export";
import { formatDate } from "@/lib/format-date";
import { formatMarks } from "@/lib/format-marks";
import { sanitizeForPdf } from "@/lib/sanitize-pdf-text";

export interface ProfileSessionRow {
  date: string;
  week: number | null;
  status: "present" | "absent" | "late" | null;
  mark: string;
  remark: string;
}

export interface StudentProfilePdfData {
  student: {
    full_name: string;
    roll_number: string | null;
    notes: string | null;
    is_active: boolean;
    section: {
      grade: number;
      section_name: string;
      school: { name: string } | null;
    } | null;
  };
  termName: string;
  history: Array<{
    academic_year: string;
    grade: number;
    section_name: string | null;
    school_name: string | null;
    start_date: string;
    end_date: string | null;
  }>;
  summary: {
    totalSessions: number;
    attCount: number;
    present: number;
    attPercent: number | null;
    obtained: number;
    totalMax: number;
    avgPercent: number | null;
  };
  /** Present when a single term is exported. */
  sessions?: ProfileSessionRow[];
  /** Present when "All Terms" is exported — one group per term with a subheader. */
  groupedSessions?: Array<{ termName: string; rows: ProfileSessionRow[] }>;
  remarks: Array<{ date: string; week: number | null; text: string; termName?: string | null }>;
}

function sanitize(s: string) {
  return s.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
}

export async function downloadStudentProfilePdf(data: StudentProfilePdfData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;

  await drawLogoHeader(doc);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text("Student Profile", marginX, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(60);
  doc.text(sanitizeForPdf(data.student.full_name), marginX, 62);

  const meta: string[] = [];
  meta.push(`Roll: ${data.student.roll_number ?? "—"}`);
  meta.push(
    `Grade: ${data.student.section?.grade ?? "—"}${
      data.student.section ? ` · ${sanitizeForPdf(data.student.section.section_name)}` : ""
    }`,
  );
  meta.push(
    `School: ${data.student.section?.school?.name ? sanitizeForPdf(data.student.section.school.name) : "—"}`,
  );
  meta.push(`Status: ${data.student.is_active ? "Active" : "Inactive"}`);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(meta.join("   ·   "), marginX, 78);

  let y = 96;

  if (data.student.notes) {
    doc.setFontSize(9);
    doc.setTextColor(80);
    const lines = doc.splitTextToSize(
      `Father Name: ${sanitizeForPdf(data.student.notes)}`,
      pageW - marginX * 2,
    );
    doc.text(lines, marginX, y);
    y += lines.length * 12 + 6;
  }

  const termNameSafe = sanitizeForPdf(data.termName || "—");

  // Term summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(`Term summary — ${termNameSafe}`, marginX, y);
  y += 6;

  autoTable(doc, {
    startY: y + 4,
    head: [["Attendance", "Marks obtained", "Average"]],
    body: [
      [
        data.summary.attPercent != null ? `${data.summary.attPercent.toFixed(0)}%` : "—",
        data.summary.totalMax > 0
          ? `${formatMarks(data.summary.obtained)} / ${formatMarks(data.summary.totalMax)}`
          : "—",
        data.summary.avgPercent != null ? `${data.summary.avgPercent.toFixed(1)}%` : "—",
      ],
      [
        `${data.summary.present} present · ${data.summary.attCount} recorded · ${data.summary.totalSessions} sessions`,
        "Blank marks excluded",
        termNameSafe,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: "grid",
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 18;

  // Enrollment history
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Enrollment history", marginX, y);
  autoTable(doc, {
    startY: y + 6,
    head: [["Year", "Grade / Section", "School", "From", "To"]],
    body:
      data.history.length === 0
        ? [["—", "—", "—", "—", "—"]]
        : data.history.map((h) => [
            h.academic_year,
            `Grade ${h.grade}${h.section_name ? ` · ${sanitizeForPdf(h.section_name)}` : ""}`,
            h.school_name ? sanitizeForPdf(h.school_name) : "—",
            formatDate(h.start_date),
            h.end_date ? formatDate(h.end_date) : "present",
          ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: "grid",
    margin: { left: marginX, right: marginX },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 18;

  // Session breakdown — either one table (single term) or grouped subheaders (all terms)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Session-by-session — ${termNameSafe}`, marginX, y);
  y += 6;

  const renderSessionTable = (rows: ProfileSessionRow[], subheader?: string) => {
    if (subheader) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30);
      doc.text(subheader, marginX, y + 12);
      y += 8;
    }
    autoTable(doc, {
      startY: y + 6,
      head: [["Date", "Week", "Attendance", "Mark", "Remark"]],
      body:
        rows.length === 0
          ? [["—", "—", "—", "—", "No sessions recorded."]]
          : rows.map((s) => [
              formatDate(s.date),
              s.week != null ? String(s.week) : "—",
              s.status ?? "—",
              sanitizeForPdf(s.mark),
              sanitizeForPdf(s.remark),
            ]),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      theme: "grid",
      columnStyles: { 4: { cellWidth: "auto" } },
      margin: { left: marginX, right: marginX },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 12;
  };

  if (data.groupedSessions && data.groupedSessions.length > 0) {
    for (const g of data.groupedSessions) {
      renderSessionTable(g.rows, `Term: ${sanitizeForPdf(g.termName)}`);
    }
  } else {
    renderSessionTable(data.sessions ?? []);
  }
  y += 6;

  // Remarks timeline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Remarks timeline — ${termNameSafe}`, marginX, y);
  autoTable(doc, {
    startY: y + 6,
    head: [["Date", "Week", "Remark"]],
    body:
      data.remarks.length === 0
        ? [["—", "—", "No remarks recorded."]]
        : data.remarks.map((r) => [
            formatDate(r.date),
            r.week != null ? String(r.week) : "—",
            r.termName
              ? `[${sanitizeForPdf(r.termName)}] ${sanitizeForPdf(r.text)}`
              : sanitizeForPdf(r.text),
          ]),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    theme: "grid",
    margin: { left: marginX, right: marginX },
  });

  // Add logo header to all subsequent pages too
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    await drawLogoHeader(doc);
  }

  drawInstitutionalFooter(doc);

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`student_profile_${sanitize(data.student.full_name)}_${stamp}.pdf`);
}
