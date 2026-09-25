import { exportCsv, exportPdf, exportXlsx, type ExportPayload } from "@/lib/school-export";

export function ExportButtons({
  payload,
  disabled,
}: {
  payload: () => ExportPayload;
  disabled?: boolean;
}) {
  const cls =
    "rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-indigo-500/50 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex gap-2">
      <button className={cls} disabled={disabled} onClick={() => exportCsv(payload())}>
        CSV
      </button>
      <button className={cls} disabled={disabled} onClick={() => exportXlsx(payload())}>
        Excel
      </button>
      <button className={cls} disabled={disabled} onClick={() => exportPdf(payload())}>
        PDF
      </button>
    </div>
  );
}
