import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Paperclip, X } from "lucide-react";
import { fadeUp } from "@/components/for-schools/Band";
import { setting, str, useSiteContent } from "@/lib/site-content";
import { submitApplication } from "@/lib/careers.functions";
import {
  ACCEPTED_CV_EXTENSIONS,
  ACCEPTED_CV_LABEL,
  MAX_CV_BYTES,
  type JobOpening,
} from "@/lib/careers.shared";
import { readAsBase64 } from "@/lib/read-as-base64";

type Errors = Partial<Record<"full_name" | "email" | "phone" | "cv" | "form", string>>;

const ALLOWED_EXT = ["pdf", "docx"];

export function ApplicationForm({
  roles,
  content,
  light,
}: {
  roles: JobOpening[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  light: boolean;
}) {
  const send = useServerFn(submitApplication);
  const fileInput = useRef<HTMLInputElement>(null);

  const site = useSiteContent();
  const waUrl = setting(site.settings, "whatsapp_url", "https://wa.me/923145978068");
  const waNumber = setting(site.settings, "whatsapp", "+92 314 5978068");
  const contactEmail = setting(site.settings, "contact_email", "contact@astrobotacademy.com");

  const [roleId, setRoleId] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [note, setNote] = useState("");
  const [company, setCompany] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // "Apply for this role" in the role list pre-selects the role here.
  useEffect(() => {
    const onApply = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) setRoleId(id);
      document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener("careers:apply", onApply);
    return () => window.removeEventListener("careers:apply", onApply);
  }, []);

  const label = light ? "text-navy-900/70" : "text-gray-mid";
  const field =
    "mt-2 w-full rounded-xl border px-4 py-3 text-[0.92rem] outline-none transition " +
    (light
      ? "border-navy-950/15 bg-white/80 text-navy-950 placeholder:text-navy-950/35 focus:border-navy-900/45"
      : "border-foreground/15 bg-foreground/[0.05] text-foreground placeholder:text-foreground/35 focus:border-cyan/50");

  function pickFile(next: File | null) {
    if (!next) {
      setFile(null);
      return;
    }
    const ext = next.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      setErrors((p) => ({ ...p, cv: "Please attach a PDF or DOCX file." }));
      setFile(null);
      return;
    }
    if (next.size > MAX_CV_BYTES) {
      setErrors((p) => ({ ...p, cv: "That file is larger than 10MB." }));
      setFile(null);
      return;
    }
    setErrors((p) => ({ ...p, cv: undefined }));
    setFile(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const next: Errors = {};
    if (fullName.trim().length < 2) next.full_name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Please enter a valid email address.";
    if (phone.trim().length < 6) next.phone = "Please enter a phone number.";
    if (!file) next.cv = "A CV is required.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setBusy(true);
    try {
      const cv_base64 = await readAsBase64(file!);
      const result = await send({
        data: {
          job_opening_id: roleId || null,
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          linkedin_url: linkedin.trim() || null,
          cover_note: note.trim() || null,
          cv_file_name: file!.name,
          cv_base64,
          company,
        },
      });
      if (result.ok) {
        setDone(true);
      } else {
        setErrors({ form: result.reason });
      }
    } catch {
      setErrors({
        form: str(
          content,
          "error_body",
          "We couldn't save your application just now. Nothing you typed has been lost.",
        ),
      });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <motion.div
        variants={fadeUp}
        className={
          "flex flex-col items-start rounded-2xl border p-8 sm:p-10 " +
          (light ? "border-navy-950/12 bg-white/80" : "border-foreground/12 bg-foreground/[0.04]")
        }
      >
        <CheckCircle2 className={"size-8 " + (light ? "text-navy-900" : "text-cyan")} aria-hidden />
        <p
          className={
            "mt-5 font-display text-[1.4rem] font-bold " +
            (light ? "text-navy-950" : "text-foreground")
          }
        >
          {str(content, "success_title", "Application received.")}
        </p>
        <p className={"mt-3 max-w-lg text-[0.94rem] leading-relaxed " + label}>
          {str(
            content,
            "success_body",
            "Thank you — your application and CV are with our team. If your background fits an upcoming intake we'll be in touch.",
          )}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.form
      variants={fadeUp}
      onSubmit={onSubmit}
      noValidate
      className={
        "rounded-2xl border p-6 sm:p-8 " +
        (light ? "border-navy-950/12 bg-white/80" : "border-foreground/12 bg-foreground/[0.04]")
      }
    >
      {/* Honeypot — hidden from people, tempting to bots. Not labeled
          "Company"/similar: that's a real autofill-recognized category, and
          browsers have been known to fill it despite autocomplete="off",
          which silently discards a genuine application (the honeypot
          branch returns success without ever saving anything). */}
      <div aria-hidden className="hidden">
        <input
          id="cr-hp"
          name="cr-hp"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="cr-role"
            className={"font-mono text-[0.62rem] uppercase tracking-[0.2em] " + label}
          >
            Role
          </label>
          <select
            id="cr-role"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className={field}
          >
            <option value="">{str(content, "general_option", "General application")}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} — {r.department}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="cr-name"
            className={"font-mono text-[0.62rem] uppercase tracking-[0.2em] " + label}
          >
            Full name
          </label>
          <input
            id="cr-name"
            value={fullName}
            maxLength={120}
            onChange={(e) => setFullName(e.target.value)}
            className={field}
            placeholder="Your name"
          />
          {errors.full_name ? (
            <p className="mt-1.5 text-[0.78rem] text-red-400">{errors.full_name}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="cr-email"
            className={"font-mono text-[0.62rem] uppercase tracking-[0.2em] " + label}
          >
            Email
          </label>
          <input
            id="cr-email"
            type="email"
            value={email}
            maxLength={255}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
            placeholder="you@example.com"
          />
          {errors.email ? (
            <p className="mt-1.5 text-[0.78rem] text-red-400">{errors.email}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="cr-phone"
            className={"font-mono text-[0.62rem] uppercase tracking-[0.2em] " + label}
          >
            Phone
          </label>
          <input
            id="cr-phone"
            value={phone}
            maxLength={40}
            onChange={(e) => setPhone(e.target.value)}
            className={field}
            placeholder="+92 300 0000000"
          />
          {errors.phone ? (
            <p className="mt-1.5 text-[0.78rem] text-red-400">{errors.phone}</p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="cr-linkedin"
            className={"font-mono text-[0.62rem] uppercase tracking-[0.2em] " + label}
          >
            LinkedIn <span className="normal-case tracking-normal opacity-70">(optional)</span>
          </label>
          <input
            id="cr-linkedin"
            value={linkedin}
            maxLength={300}
            onChange={(e) => setLinkedin(e.target.value)}
            className={field}
            placeholder="linkedin.com/in/…"
          />
        </div>

        <div className="sm:col-span-2">
          <span className={"font-mono text-[0.62rem] uppercase tracking-[0.2em] " + label}>CV</span>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_CV_EXTENSIONS}
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div
              className={
                "mt-2 flex items-center justify-between gap-4 rounded-xl border px-4 py-3 " +
                (light
                  ? "border-navy-950/15 bg-white"
                  : "border-foreground/15 bg-foreground/[0.05]")
              }
            >
              <span
                className={
                  "flex min-w-0 items-center gap-2.5 text-[0.88rem] " +
                  (light ? "text-navy-950" : "text-foreground")
                }
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{file.name}</span>
                <span className={"shrink-0 font-mono text-[0.65rem] " + label}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                className={
                  "shrink-0 rounded-full p-1 transition " +
                  (light ? "hover:bg-navy-950/10" : "hover:bg-foreground/10")
                }
                aria-label="Remove attached CV"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className={
                "mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-5 text-left transition " +
                (light
                  ? "border-navy-950/25 hover:border-navy-900/50 hover:bg-white"
                  : "border-foreground/20 hover:border-cyan/45 hover:bg-foreground/[0.06]")
              }
            >
              <Paperclip
                className={"size-4 " + (light ? "text-navy-900" : "text-cyan")}
                aria-hidden
              />
              <span>
                <span
                  className={"block text-[0.9rem] " + (light ? "text-navy-950" : "text-foreground")}
                >
                  Attach your CV
                </span>
                <span
                  className={"block font-mono text-[0.65rem] uppercase tracking-[0.16em] " + label}
                >
                  {ACCEPTED_CV_LABEL}
                </span>
              </span>
            </button>
          )}
          {errors.cv ? <p className="mt-1.5 text-[0.78rem] text-red-400">{errors.cv}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="cr-note"
            className={"font-mono text-[0.62rem] uppercase tracking-[0.2em] " + label}
          >
            Cover note <span className="normal-case tracking-normal opacity-70">(optional)</span>
          </label>
          <textarea
            id="cr-note"
            rows={5}
            value={note}
            maxLength={4000}
            onChange={(e) => setNote(e.target.value)}
            className={field + " resize-y"}
            placeholder="Anything you'd like us to know."
          />
        </div>
      </div>

      {errors.form ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3"
        >
          <p
            className={
              "flex items-center gap-2 font-display text-[0.95rem] font-semibold " +
              (light ? "text-navy-950" : "text-foreground")
            }
          >
            <AlertTriangle className="size-4 text-red-400" aria-hidden />
            {str(content, "error_title", "That didn't send.")}
          </p>
          <p className={"mt-1 text-[0.85rem] " + label}>{errors.form}</p>
          <p className={"mt-2 text-[0.85rem] " + label}>
            Reach us on{" "}
            <a className="text-cyan underline" href={waUrl} target="_blank" rel="noreferrer">
              WhatsApp ({waNumber})
            </a>{" "}
            or{" "}
            <a className="text-cyan underline" href={`mailto:${contactEmail}`}>
              {contactEmail}
            </a>
            . Your answers below are untouched.
          </p>
        </div>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-navy-950 transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {busy ? "Sending" : "Send application"}
        </button>
        <p className={"max-w-xs text-[0.75rem] leading-relaxed " + label}>
          {str(
            content,
            "form_note",
            "Your CV is stored privately and is only ever seen by the AstroBot hiring team.",
          )}
        </p>
      </div>
    </motion.form>
  );
}
