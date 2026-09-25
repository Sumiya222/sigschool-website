/**
 * Shared dashboard UI primitives.
 *
 * Every admin surface (Instructor / School / Admin) uses the "blueprint"
 * design tokens (--bp-*) defined in src/styles.css. These components wrap the
 * repeated markup so panels stay visually identical everywhere.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { GripVertical, X } from "lucide-react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ── Layout ─────────────────────────────────────────────────────────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && (
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--bp-muted)]">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl font-semibold text-[color:var(--bp-ink)] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-[color:var(--bp-ink-2)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Panel({
  title,
  hint,
  actions,
  children,
  padded = true,
  className = "",
}: {
  title?: string;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
}) {
  return (
    <section className={cx("bp-panel relative", className)}>
      <span className="bp-tick-tl" />
      <span className="bp-tick-tr" />
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--bp-line)] px-5 py-4 sm:px-6">
          <div>
            {title && (
              <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
                {title}
              </h2>
            )}
            {hint && <p className="mt-1 text-xs text-[color:var(--bp-muted)]">{hint}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-5 sm:p-6" : ""}>{children}</div>
    </section>
  );
}

/* ── Buttons ────────────────────────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[color:var(--bp-indigo)] text-[#0b0b1e] font-semibold hover:brightness-110 border border-transparent",
  secondary:
    "border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] text-[color:var(--bp-ink)] hover:border-[color:var(--bp-indigo)]",
  ghost:
    "border border-transparent text-[color:var(--bp-ink-2)] hover:bg-[color:var(--bp-paper-2)] hover:text-[color:var(--bp-ink)]",
  danger:
    "border border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-400 hover:bg-red-500/20",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md";
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        VARIANTS[variant],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        "inline-flex size-8 items-center justify-center rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] text-[color:var(--bp-ink-2)] transition hover:border-[color:var(--bp-indigo)] hover:text-[color:var(--bp-ink)] disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Form controls ──────────────────────────────────────────────────────── */

const CONTROL =
  "w-full rounded-md border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)] px-3.5 py-2.5 text-sm text-[color:var(--bp-ink)] outline-none transition focus:border-[color:var(--bp-indigo)] focus:ring-2 focus:ring-[color:var(--bp-indigo)]/25";

export function Field({
  label,
  help,
  error,
  children,
  htmlFor,
}: {
  label: string;
  help?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]"
      >
        {label}
      </label>
      {children}
      {error ? (
        <span className="text-[11px] text-red-300">{error}</span>
      ) : help ? (
        <span className="text-[11px] leading-relaxed text-[color:var(--bp-muted)]">{help}</span>
      ) : null}
    </div>
  );
}

export function TextInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(CONTROL, className)} />;
}

export function TextArea({
  className = "",
  rows = 3,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} {...rest} className={cx(CONTROL, "resize-y", className)} />;
}

export function SelectInput({
  className = "",
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(CONTROL, "appearance-none pr-8", className)}>
      {children}
    </select>
  );
}

export function LabelledField({
  label,
  help,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  help?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <Field label={label} help={help} htmlFor={id}>
      {multiline ? (
        <TextArea
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <TextInput
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  help,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  help?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cx("flex items-start gap-3", disabled && "opacity-60")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          "mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition",
          checked
            ? "border-[color:var(--bp-indigo)] bg-[color:var(--bp-indigo)]/70"
            : "border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)]",
        )}
      >
        <span
          className={cx(
            "inline-block size-3.5 rounded-full bg-[color:var(--bp-ink)] transition",
            checked ? "translate-x-[18px]" : "translate-x-[3px]",
          )}
        />
      </button>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[color:var(--bp-ink)]">{label}</span>
        {help && (
          <span className="mt-0.5 block text-[11px] leading-relaxed text-[color:var(--bp-muted)]">
            {help}
          </span>
        )}
      </span>
    </label>
  );
}

/* ── Table ──────────────────────────────────────────────────────────────── */

export function Table({ children, minWidth = 720 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={cx(
        "border-b border-[color:var(--bp-line)] px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-muted)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <td
      className={cx(
        "border-b border-[color:var(--bp-line)] px-4 py-3 align-middle text-[color:var(--bp-ink)]",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* ── States ─────────────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="font-display text-base font-semibold text-[color:var(--bp-ink)]">{title}</p>
      {description && (
        <p className="max-w-md text-sm leading-relaxed text-[color:var(--bp-ink-2)]">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-12 font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
      <span className="inline-block size-2 animate-pulse rounded-full bg-[color:var(--bp-indigo)]" />
      {label}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      {children}
    </div>
  );
}

/* ── Toast ──────────────────────────────────────────────────────────────── */

type ToastFn = (message: string, tone?: "success" | "error") => void;
const ToastContext = createContext<ToastFn>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; message: string; tone: "success" | "error" }[]>(
    [],
  );

  const push = useCallback<ToastFn>((message, tone = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 3200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
        {items.map((i) => (
          <div
            key={i.id}
            role="status"
            className={cx(
              "pointer-events-auto rounded-lg border px-4 py-2.5 text-sm shadow-lg backdrop-blur",
              i.tone === "error"
                ? "border-red-500/40 bg-red-500/15 text-red-200"
                : "border-[color:var(--bp-indigo)]/50 bg-[color:var(--bp-paper-2)]/95 text-[color:var(--bp-ink)]",
            )}
          >
            {i.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ── Modal + confirmation ───────────────────────────────────────────────── */

export function Modal({
  open,
  title,
  onClose,
  children,
  width = 720,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full rounded-xl border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] shadow-2xl"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--bp-line)] px-5 py-4">
          <h2 className="font-display text-base font-semibold text-[color:var(--bp-ink)]">
            {title}
          </h2>
          <IconButton label="Close this window" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </IconButton>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel} width={520}>
      <div className="space-y-5">
        <div className="text-sm leading-relaxed text-[color:var(--bp-ink-2)]">{description}</div>
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Drag-to-reorder list ───────────────────────────────────────────────── */

export function DragHandle() {
  return (
    <span
      className="cursor-grab text-[color:var(--bp-muted)] active:cursor-grabbing"
      title="Drag to reorder"
      aria-hidden
    >
      <GripVertical className="size-4" />
    </span>
  );
}

/**
 * Minimal HTML5 drag-and-drop reorder wrapper. `onReorder` receives the new
 * index order; keyboard users get the up/down buttons rendered by the caller.
 */
export function useDragReorder(onReorder: (from: number, to: number) => void) {
  const [dragging, setDragging] = useState<number | null>(null);
  return (index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDragging(index);
      e.dataTransfer.effectAllowed = "move";
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragging !== null && dragging !== index) onReorder(dragging, index);
      setDragging(null);
    },
    onDragEnd: () => setDragging(null),
    "data-dragging": dragging === index ? "true" : undefined,
  });
}

/* ── Unsaved-changes guard ──────────────────────────────────────────────── */

export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return useCallback(
    (action: () => void) => {
      if (!dirty || window.confirm("You have unsaved changes. Leave without saving?")) action();
    },
    [dirty],
  );
}
