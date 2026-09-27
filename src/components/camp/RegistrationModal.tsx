import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, Mail, MessageCircle, X } from "lucide-react";
import { setting, useSiteContent } from "@/lib/site-content";
import {
  AGE_TRACKS,
  MAX_UPLOAD_BYTES,
  MEDIA_CONSENT_LABEL,
  UPLOAD_ACCEPT,
  UPLOAD_HINT,
  trackForAge,
  trackLabel,
  type RegistrationField,
} from "@/lib/registrations.shared";
import { submitRegistration } from "@/lib/registrations.functions";
import { toWebP } from "@/lib/image-webp";
import { readAsBase64 } from "@/lib/read-as-base64";
import { BRAND } from "@/lib/brand";

/* ── Shared control styling ───────────────────────────────────────────── */

const inputCls =
  "w-full rounded-lg border border-foreground/15 bg-navy-950/60 px-3.5 py-2.5 text-[0.92rem] text-foreground placeholder:text-gray-mid/60 transition focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/25";

const labelCls = "block font-mono text-[0.62rem] uppercase tracking-[0.18em] text-gray-mid";

function FieldShell({
  label,
  required,
  help,
  error,
  htmlFor,
  children,
  full,
}: {
  label: string;
  required?: boolean;
  help?: string | null;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label className={labelCls} htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-gold">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {help ? <p className="mt-1.5 text-[0.75rem] text-gray-mid">{help}</p> : null}
      {error ? (
        <p role="alert" className="mt-1.5 text-[0.75rem] font-medium text-gold-bright">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ── Custom field control ─────────────────────────────────────────────── */

function CustomControl({
  field,
  value,
  error,
  onChange,
  onFile,
  disabled,
}: {
  field: RegistrationField;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onFile?: (file: File | null) => void;
  disabled?: boolean;
}) {
  const id = `rf-${field.id}`;
  const common = { id, disabled, className: inputCls };
  const full =
    field.field_type === "textarea" || field.field_type === "radio" || field.field_type === "file";

  return (
    <FieldShell
      label={field.label}
      required={field.required}
      help={field.help_text ?? (field.field_type === "file" ? UPLOAD_HINT : null)}
      error={error}
      htmlFor={id}
      full={full}
    >
      {field.field_type === "file" ? (
        <div className="flex flex-wrap items-center gap-3">
          <input
            id={id}
            type="file"
            accept={UPLOAD_ACCEPT}
            disabled={disabled}
            onChange={(e) => onFile?.(e.target.files?.[0] ?? null)}
            className="block w-full cursor-pointer rounded-lg border border-dashed border-foreground/20 bg-navy-950/40 px-3.5 py-2.5 text-[0.85rem] text-gray-mid file:mr-3 file:rounded-md file:border-0 file:bg-gold/15 file:px-3 file:py-1.5 file:text-[0.78rem] file:font-medium file:text-gold hover:border-gold/40"
          />
          {value ? <p className="text-[0.78rem] text-foreground/80">Attached: {value}</p> : null}
        </div>
      ) : field.field_type === "textarea" ? (
        <textarea {...common} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : field.field_type === "dropdown" ? (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Please choose…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.field_type === "radio" ? (
        <div className="flex flex-wrap gap-2">
          {field.options.map((o) => (
            <button
              key={o}
              type="button"
              disabled={disabled}
              aria-pressed={value === o}
              onClick={() => onChange(value === o ? "" : o)}
              className={
                "rounded-full border px-3.5 py-1.5 text-[0.82rem] transition " +
                (value === o
                  ? "border-gold/60 bg-gold/12 text-gold"
                  : "border-foreground/15 text-gray-mid hover:border-foreground/30 hover:text-foreground")
              }
            >
              {o}
            </button>
          ))}
        </div>
      ) : field.field_type === "checkbox" ? (
        <label className="flex items-start gap-2.5 text-[0.88rem] text-foreground/90">
          <input
            id={id}
            type="checkbox"
            disabled={disabled}
            checked={value === "Yes"}
            onChange={(e) => onChange(e.target.checked ? "Yes" : "")}
            className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
          />
          <span>Yes</span>
        </label>
      ) : (
        <input
          {...common}
          type={
            field.field_type === "number" ? "number" : field.field_type === "date" ? "date" : "text"
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FieldShell>
  );
}

/* ── Modal ────────────────────────────────────────────────────────────── */

type Props = {
  onClose: () => void;
  /** CMS preview: renders the exact form shape but never submits. */
  preview?: boolean;
  fieldsOverride?: RegistrationField[];
  campNameOverride?: string;
};

type CoreForm = {
  student_first_name: string;
  student_last_name: string;
  student_age: string;
  student_school: string;
  parent_name: string;
  parent_email: string;
  parent_phone: string;
  medical_notes: string;
};

const EMPTY_CORE: CoreForm = {
  student_first_name: "",
  student_last_name: "",
  student_age: "",
  student_school: "",
  parent_name: "",
  parent_email: "",
  parent_phone: "",
  medical_notes: "",
};

export function RegistrationModal({ onClose, preview, fieldsOverride, campNameOverride }: Props) {
  const content = useSiteContent();
  const camp = content.campWindow;
  const fields = (fieldsOverride ?? content.registrationFields)
    .filter((f) => f.active)
    .sort((a, b) => a.order - b.order);

  const campName = campNameOverride ?? camp?.camp_name ?? "the camp";
  const whatsapp = setting(content.settings, "whatsapp_number", BRAND.phone);
  const email = setting(content.settings, "contact_email", BRAND.contactEmail);
  const waUrl = `https://wa.me/${whatsapp.replace(/\D/g, "")}`;

  const [core, setCore] = useState<CoreForm>(EMPTY_CORE);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [uploads, setUploads] = useState<Record<string, { name: string; base64: string }>>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { waitlisted: boolean }>(null);

  const submit = useServerFn(submitRegistration);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const age = core.student_age.trim() === "" ? null : Number(core.student_age);
  const track = useMemo(() => trackForAge(age), [age]);
  const waitlistExpected = !!camp?.is_full;

  function setField<K extends keyof CoreForm>(key: K, value: string) {
    setCore((c) => ({ ...c, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _drop, ...rest } = e;
      return rest;
    });
  }

  /** Element id for each validated field, in the order they appear on the
   * form — used to find and jump to the first error after a failed
   * validation, since the field itself can be scrolled out of view by the
   * time someone reaches the submit button on a long form. */
  const CORE_FIELD_IDS: Record<string, string> = {
    student_first_name: "rf-first",
    student_last_name: "rf-last",
    student_age: "rf-age",
    parent_name: "rf-pname",
    parent_email: "rf-pemail",
    parent_phone: "rf-pphone",
  };

  function focusFirstError(errs: Record<string, string>) {
    const orderedKeys = [...Object.keys(CORE_FIELD_IDS), ...fields.map((f) => f.id)];
    const firstKey = orderedKeys.find((k) => errs[k]);
    if (!firstKey) return;
    const id = CORE_FIELD_IDS[firstKey] ?? `rf-${firstKey}`;
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (core.student_first_name.trim().length < 1)
      next.student_first_name = "Please enter a first name";
    if (core.student_last_name.trim().length < 1)
      next.student_last_name = "Please enter a last name";
    if (age == null || Number.isNaN(age) || age < 3 || age > 19)
      next.student_age = "Please enter the child's age";
    if (core.parent_name.trim().length < 2) next.parent_name = "Please enter your name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(core.parent_email.trim()))
      next.parent_email = "Please enter a valid email address";
    if (core.parent_phone.replace(/\D/g, "").length < 6)
      next.parent_phone = "Please enter a phone or WhatsApp number";
    for (const f of fields) {
      if (f.required && !(answers[f.id] ?? "").trim()) next[f.id] = `${f.label} is required`;
    }
    return next;
  }

  function clearError(id: string) {
    setErrors((e) => {
      if (!e[id]) return e;
      const { [id]: _drop, ...rest } = e;
      return rest;
    });
  }

  /** Read an attachment in the browser so the server fn stays a single call. */
  async function handleFile(id: string, input: File | null) {
    let file = input;
    if (!file) {
      setUploads((u) => {
        const { [id]: _drop, ...rest } = u;
        return rest;
      });
      setAnswers((a) => ({ ...a, [id]: "" }));
      return;
    }
    // Photos of receipts are converted to WebP before upload; PDFs pass through.
    file = await toWebP(file);
    if (file.size > MAX_UPLOAD_BYTES) {
      setErrors((e) => ({ ...e, [id]: "That file is larger than 10MB." }));
      return;
    }
    const base64 = await readAsBase64(file).catch(() => null);

    if (!base64) {
      setErrors((e) => ({ ...e, [id]: "We couldn't read that file. Please try another." }));
      return;
    }
    setUploads((u) => ({ ...u, [id]: { name: file.name, base64 } }));
    setAnswers((a) => ({ ...a, [id]: file.name }));
    clearError(id);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setFailure(null);
      focusFirstError(next);
      return;
    }

    setBusy(true);
    setFailure(null);
    try {
      const res = await submit({
        data: {
          student_first_name: core.student_first_name.trim(),
          student_last_name: core.student_last_name.trim(),
          student_age: Number(core.student_age),
          student_school: core.student_school.trim() || null,
          parent_name: core.parent_name.trim(),
          parent_email: core.parent_email.trim(),
          parent_phone: core.parent_phone.trim(),
          medical_notes: core.medical_notes.trim() || null,
          consent_media: consent,
          answers,
          uploads,
          company: honeypot,
        },
      });
      if (res.ok) setDone({ waitlisted: res.waitlisted });
      else {
        // Everything entered stays exactly where it is.
        setFailure(res.reason);
        if (res.fieldErrors) {
          setErrors(res.fieldErrors);
          focusFirstError(res.fieldErrors);
        }
      }
    } catch {
      setFailure("We couldn't reach the registration desk just now.");
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-navy-950/80 p-4 backdrop-blur-sm sm:p-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="camp-reg-title"
        tabIndex={-1}
        className="relative my-auto w-full max-w-2xl rounded-2xl border border-gold/25 bg-navy-950/95 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-foreground/12 px-6 py-5">
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-gold">
              {preview ? "Form preview" : waitlistExpected ? "Waitlist" : "Camp registration"}
            </p>
            <h2
              id="camp-reg-title"
              className="mt-1.5 font-display text-[1.35rem] font-bold text-foreground"
            >
              {campName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-mid transition hover:text-foreground"
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle2 className="mx-auto size-10 text-gold" aria-hidden />
            <h3 className="mt-4 font-display text-[1.2rem] font-semibold text-foreground">
              {done.waitlisted ? "You're on the waitlist" : "Registration received"}
            </h3>
            <p className="mx-auto mt-3 max-w-md text-[0.92rem] leading-relaxed text-gray-mid">
              {done.waitlisted
                ? `${campName} is currently full. We've recorded this registration on the waitlist and will contact you on the number you gave us the moment a place opens.`
                : `We've recorded this registration for ${campName}. Our team reviews every entry and will confirm the place, the reporting time and what to bring by phone or email within two working days.`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-navy-950 transition hover:brightness-110"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                WhatsApp {whatsapp}
              </a>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.68rem] uppercase tracking-[0.2em] text-foreground/80 transition hover:border-cyan/50 hover:text-cyan"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="px-6 py-6">
            {waitlistExpected && (
              <p className="mb-5 rounded-lg border border-gold/35 bg-gold/[0.08] px-4 py-3 text-[0.85rem] text-foreground">
                This camp has reached its capacity. You can still register — entries are saved to
                the waitlist in the order they arrive.
              </p>
            )}

            {failure && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-gold/40 bg-gold/[0.08] p-4 text-[0.88rem] text-foreground"
              >
                <p className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="size-4 text-gold" aria-hidden />
                  That didn't send.
                </p>
                <p className="mt-2 text-gray-mid">{failure}</p>
                <p className="mt-2 text-gray-mid">
                  Reach us on{" "}
                  <a className="text-cyan underline" href={waUrl} target="_blank" rel="noreferrer">
                    WhatsApp ({whatsapp})
                  </a>{" "}
                  or{" "}
                  <a className="text-cyan underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                  . Nothing you typed has been lost.
                </p>
              </div>
            )}

            {/* Locked core fields — always first, always present. */}
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldShell
                label="Student first name"
                required
                error={errors.student_first_name}
                htmlFor="rf-first"
              >
                <input
                  id="rf-first"
                  className={inputCls}
                  value={core.student_first_name}
                  disabled={preview}
                  onChange={(e) => setField("student_first_name", e.target.value)}
                />
              </FieldShell>
              <FieldShell
                label="Student last name"
                required
                error={errors.student_last_name}
                htmlFor="rf-last"
              >
                <input
                  id="rf-last"
                  className={inputCls}
                  value={core.student_last_name}
                  disabled={preview}
                  onChange={(e) => setField("student_last_name", e.target.value)}
                />
              </FieldShell>

              <FieldShell label="Student age" required error={errors.student_age} htmlFor="rf-age">
                <input
                  id="rf-age"
                  type="number"
                  min={3}
                  max={19}
                  className={inputCls}
                  value={core.student_age}
                  disabled={preview}
                  onChange={(e) => setField("student_age", e.target.value)}
                />
                <div aria-live="polite" className="mt-2">
                  {age != null && !Number.isNaN(age) ? (
                    track ? (
                      <p className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/[0.08] px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-cyan">
                        {trackLabel(track)}
                      </p>
                    ) : (
                      <p className="text-[0.75rem] text-gray-mid">
                        Our tracks run from 5 to 17 — tell us more and we'll advise.
                      </p>
                    )
                  ) : (
                    <p className="text-[0.72rem] text-gray-mid/80">
                      {AGE_TRACKS.map((t) => `${t.label} ${t.min}–${t.max}`).join(" · ")}
                    </p>
                  )}
                </div>
              </FieldShell>

              <FieldShell label="Student's school" htmlFor="rf-school">
                <input
                  id="rf-school"
                  className={inputCls}
                  value={core.student_school}
                  disabled={preview}
                  onChange={(e) => setField("student_school", e.target.value)}
                />
              </FieldShell>

              <FieldShell
                label="Parent / guardian name"
                required
                error={errors.parent_name}
                htmlFor="rf-pname"
              >
                <input
                  id="rf-pname"
                  className={inputCls}
                  autoComplete="name"
                  value={core.parent_name}
                  disabled={preview}
                  onChange={(e) => setField("parent_name", e.target.value)}
                />
              </FieldShell>
              <FieldShell
                label="Parent email"
                required
                error={errors.parent_email}
                htmlFor="rf-pemail"
              >
                <input
                  id="rf-pemail"
                  type="email"
                  autoComplete="email"
                  className={inputCls}
                  value={core.parent_email}
                  disabled={preview}
                  onChange={(e) => setField("parent_email", e.target.value)}
                />
              </FieldShell>
              <FieldShell
                label="Parent phone / WhatsApp"
                required
                error={errors.parent_phone}
                htmlFor="rf-pphone"
                full
              >
                <input
                  id="rf-pphone"
                  type="tel"
                  autoComplete="tel"
                  className={inputCls}
                  value={core.parent_phone}
                  disabled={preview}
                  onChange={(e) => setField("parent_phone", e.target.value)}
                />
              </FieldShell>

              <FieldShell
                label="Medical or accessibility notes"
                help="Allergies, medication, or anything an instructor should know."
                htmlFor="rf-med"
                full
              >
                <textarea
                  id="rf-med"
                  rows={2}
                  className={inputCls}
                  value={core.medical_notes}
                  disabled={preview}
                  onChange={(e) => setField("medical_notes", e.target.value)}
                />
              </FieldShell>
            </div>

            {/* Custom fields, in CMS order. */}
            {fields.length > 0 && (
              <div className="mt-5 grid gap-5 border-t border-foreground/10 pt-5 sm:grid-cols-2">
                {fields.map((f) => (
                  <CustomControl
                    key={f.id}
                    field={f}
                    disabled={preview}
                    value={answers[f.id] ?? ""}
                    error={errors[f.id]}
                    onFile={(file) => {
                      void handleFile(f.id, file);
                    }}
                    onChange={(v) => {
                      setAnswers((a) => ({ ...a, [f.id]: v }));
                      setErrors((e) => {
                        if (!e[f.id]) return e;
                        const { [f.id]: _drop, ...rest } = e;
                        return rest;
                      });
                    }}
                  />
                ))}
              </div>
            )}

            {/* Optional media consent — registration succeeds either way. */}
            <label className="mt-6 flex items-start gap-3 rounded-lg border border-foreground/12 bg-foreground/[0.03] p-4 text-[0.86rem] leading-relaxed text-foreground/90">
              <input
                type="checkbox"
                checked={consent}
                disabled={preview}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]"
              />
              <span>
                {MEDIA_CONSENT_LABEL}
                <span className="mt-1 block text-[0.75rem] text-gray-mid">
                  Optional — leaving this unticked does not affect the registration.
                </span>
              </span>
            </label>

            {/* Honeypot — hidden from people. Not labeled "Company"/similar:
                that's a real autofill-recognized category, and browsers
                have been known to fill it despite autocomplete="off", which
                silently discards a genuine registration (the honeypot
                branch returns success without ever saving anything). */}
            <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
              <input
                id="rf-hp"
                name="rf-hp"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={busy || preview}
                className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-navy-950 transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                {preview
                  ? "Preview only"
                  : waitlistExpected
                    ? "Join the waitlist"
                    : "Submit registration"}
              </button>
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-gray-mid transition hover:text-cyan"
              >
                <Mail className="size-3.5" aria-hidden />
                {email}
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(body, document.body);
}
