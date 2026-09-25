import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { fadeUp, stagger } from "@/components/for-schools/Band";
import { submitInquiry, type InquiryType } from "@/lib/inquiries.functions";
import { setting, str, useSiteContent } from "@/lib/site-content";

/* ── Track definitions ─────────────────────────────────────────────────────
   Each track is its own short questionnaire. Parents are never asked school
   procurement questions, and schools are never asked about a single child. */

type FieldKind = "text" | "email" | "tel" | "select" | "textarea";

type Field = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  autoComplete?: string;
  full?: boolean;
};

type Track = {
  id: InquiryType;
  title: string;
  tagline: string;
  intro: string;
  fields: Field[];
  submitLabel: string;
};

const NAME: Field = {
  key: "full_name",
  label: "Full name",
  kind: "text",
  required: true,
  autoComplete: "name",
};
const EMAIL: Field = {
  key: "email",
  label: "Email",
  kind: "email",
  required: true,
  autoComplete: "email",
};
const PHONE: Field = {
  key: "phone",
  label: "Phone / WhatsApp",
  kind: "tel",
  required: true,
  autoComplete: "tel",
};

const TRACKS: Track[] = [
  {
    id: "parent",
    title: "Parent",
    tagline: "For a child",
    intro: "Camps, workshops and how to hear about the next registration window.",
    submitLabel: "Send inquiry",
    fields: [
      NAME,
      EMAIL,
      PHONE,
      {
        key: "child_age",
        label: "Child's age group",
        kind: "select",
        required: true,
        options: ["5–7 years", "8–10 years", "11–13 years", "14–17 years", "More than one child"],
      },
      {
        key: "interest",
        label: "What you're looking at",
        kind: "select",
        required: true,
        options: [
          "Summer Boot Camp",
          "Winter Boot Camp",
          "Weekend Workshop",
          "Year-round programme at my child's school",
          "Not sure yet — advise me",
        ],
      },
      { key: "city", label: "City", kind: "text", placeholder: "Rawalpindi / Islamabad" },
      {
        key: "message",
        label: "What would you like to know?",
        kind: "textarea",
        required: true,
        full: true,
        placeholder: "Tell us about your child's interests and what you'd like from the programme.",
      },
    ],
  },
  {
    id: "school",
    title: "School",
    tagline: "For a campus",
    intro: "The timetabled year-round subject — curriculum, kits, instructors and reporting.",
    submitLabel: "Request a briefing",
    fields: [
      NAME,
      EMAIL,
      PHONE,
      { key: "school_name", label: "School name", kind: "text", required: true },
      {
        key: "role",
        label: "Your role",
        kind: "text",
        placeholder: "Principal, Director, Coordinator…",
      },
      { key: "city", label: "City / campus location", kind: "text" },
      {
        key: "student_count",
        label: "Approximate students",
        kind: "select",
        options: ["Under 200", "200–500", "500–1,000", "1,000–2,500", "More than 2,500"],
      },
      {
        key: "grade_range",
        label: "Grades under consideration",
        kind: "select",
        options: [
          "ECE – Grade 2",
          "Grade 3 – Grade 5",
          "Grade 6 – Grade 8",
          "Full ECE – Grade 8",
          "Undecided",
        ],
      },
      {
        key: "timeline",
        label: "Intended start",
        kind: "select",
        options: ["This term", "Next term", "Next academic year", "Exploring only"],
      },
      {
        key: "message",
        label: "What should we prepare for you?",
        kind: "textarea",
        required: true,
        full: true,
        placeholder:
          "Timetable constraints, room availability, board requirements, anything we should know.",
      },
    ],
  },
  {
    id: "other",
    title: "Other",
    tagline: "Everything else",
    intro: "Careers, media, sponsorship, partnerships and general questions.",
    submitLabel: "Send message",
    fields: [
      NAME,
      EMAIL,
      PHONE,
      { key: "organisation", label: "Organisation", kind: "text" },
      {
        key: "subject",
        label: "Subject",
        kind: "select",
        required: true,
        options: [
          "Instructor / careers",
          "Media & press",
          "Partnership or sponsorship",
          "Competitions & events",
          "Something else",
        ],
      },
      {
        key: "message",
        label: "Your message",
        kind: "textarea",
        required: true,
        full: true,
        placeholder: "Tell us what you're after and we'll route it to the right person.",
      },
    ],
  },
];

const CORE_KEYS = new Set(["full_name", "email", "phone", "message", "school_name", "role"]);

const inputBase =
  "w-full rounded-lg border bg-foreground/[0.04] px-3.5 py-2.5 text-[0.95rem] text-foreground placeholder:text-gray-mid/60 outline-none transition focus:border-cyan/60 focus:bg-foreground/[0.06]";

type Values = Record<string, string>;
type Errors = Record<string, string | undefined>;

function validate(track: Track, v: Values): Errors {
  const e: Errors = {};
  for (const f of track.fields) {
    const value = (v[f.key] ?? "").trim();
    if (f.required && !value) {
      e[f.key] = f.kind === "select" ? "Please choose an option." : "This field is required.";
      continue;
    }
    if (!value) continue;
    if (f.key === "full_name" && value.length < 2) e[f.key] = "Please enter your name.";
    if (f.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))
      e[f.key] = "Please enter a valid email address.";
    if (f.kind === "tel" && value.replace(/\D/g, "").length < 7)
      e[f.key] = "Please enter a phone or WhatsApp number.";
    if (f.kind === "textarea" && value.length < 10)
      e[f.key] = "Please tell us a little more — at least a sentence.";
  }
  return e;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function InquiryForm({ content }: { content: Record<string, any> }) {
  const site = useSiteContent();
  const send = useServerFn(submitInquiry);

  const waUrl = setting(site.settings, "whatsapp_url", "https://wa.me/923145978068");
  const waNumber = setting(site.settings, "whatsapp", "+92 314 5978068");
  const email = setting(site.settings, "contact_email", "contact@astrobotacademy.com");
  const responseNote = setting(
    site.settings,
    "response_time_note",
    "Typical response time: 24 hours",
  );

  const [trackId, setTrackId] = useState<InquiryType>("parent");
  const [values, setValues] = useState<Record<InquiryType, Values>>({
    parent: {},
    school: {},
    other: {},
  });
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [failure, setFailure] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  const track = useMemo(() => TRACKS.find((t) => t.id === trackId)!, [trackId]);
  const form = values[trackId];

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [trackId]: { ...v[trackId], [key]: value } }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function switchTrack(id: InquiryType) {
    if (id === trackId) return;
    // Carry the contact details across so nothing is retyped.
    setValues((v) => ({
      ...v,
      [id]: {
        full_name: v[id].full_name || v[trackId].full_name || "",
        email: v[id].email || v[trackId].email || "",
        phone: v[id].phone || v[trackId].phone || "",
        ...v[id],
      },
    }));
    setErrors({});
    setFailure(null);
    setTrackId(id);
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const found = validate(track, form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      document.querySelector<HTMLElement>("[data-invalid='true']")?.focus();
      return;
    }
    setFailure(null);
    setState("sending");

    const details: Record<string, string> = {};
    for (const f of track.fields) {
      if (CORE_KEYS.has(f.key)) continue;
      const value = (form[f.key] ?? "").trim();
      if (value) details[f.label] = value;
    }

    try {
      const res = await send({
        data: {
          full_name: form.full_name ?? "",
          email: form.email ?? "",
          phone: form.phone ?? "",
          type: trackId,
          school_name: form.school_name ?? "",
          role: form.role ?? "",
          message: form.message ?? "",
          details,
          company: honeypot,
        },
      });
      if (res.ok) setState("sent");
      else {
        setState("idle");
        setFailure(res.reason);
      }
    } catch {
      setState("idle");
      setFailure(str(content, "error_body", "Something went wrong on our side."));
    }
  }

  if (state === "sent") {
    return (
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="rounded-2xl border border-cyan/30 bg-cyan/12 backdrop-blur-md p-7"
      >
        <CheckCircle2 className="size-7 text-cyan" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-bold text-foreground">
          {str(content, "success_title", "Inquiry received.")}
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-offwhite/80">
          {str(content, "success_body", "Thank you — your message is with our team.")}
        </p>
        <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-cyan">
          {responseNote}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-navy-950 transition hover:brightness-110"
          >
            <MessageCircle className="size-3.5" aria-hidden />
            Faster: WhatsApp us
          </a>
          <a
            href={`mailto:${email}`}
            className="inline-flex items-center gap-2 rounded-full border border-foreground/18 px-5 py-2.5 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-foreground/80 transition hover:border-cyan/50 hover:text-cyan"
          >
            <Mail className="size-3.5" aria-hidden />
            {email}
          </a>
        </div>
      </motion.div>
    );
  }

  const assurances = [
    str(content, "assurance_1", responseNote),
    str(content, "assurance_2", "Your details stay with AstroBot — never shared"),
    str(content, "assurance_3", "No obligation — just a clear next step"),
  ].filter(Boolean);

  return (
    <motion.form
      variants={fadeUp}
      onSubmit={onSubmit}
      noValidate
      className="overflow-hidden rounded-2xl border border-foreground/12 bg-foreground/[0.03] backdrop-blur-sm"
    >
      {/* Track selector */}
      <div
        role="tablist"
        aria-label="Type of inquiry"
        className="grid border-b border-foreground/12 sm:grid-cols-3"
      >
        {TRACKS.map((t) => {
          const active = t.id === trackId;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchTrack(t.id)}
              className={
                "relative min-w-0 px-3 py-3.5 text-center transition first:border-l-0 sm:border-l sm:border-foreground/10 " +
                (active ? "bg-gold/[0.09]" : "hover:bg-foreground/[0.04]")
              }
            >
              {active ? (
                <motion.span
                  layoutId="track-underline"
                  className="absolute inset-x-0 top-0 h-px bg-gold"
                  aria-hidden
                />
              ) : null}
              <span
                className={
                  "block truncate font-mono text-[0.7rem] font-semibold uppercase tracking-[0.16em] " +
                  (active ? "text-gold" : "text-gray-mid")
                }
              >
                {t.title}
              </span>
              <span
                className={
                  "mt-1 block truncate font-mono text-[0.54rem] uppercase tracking-[0.16em] " +
                  (active ? "text-gold/70" : "text-gray-mid/60")
                }
              >
                {t.tagline}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-6 sm:p-7">
        <p className="text-[0.85rem] leading-relaxed text-gray-mid">{track.intro}</p>

        {failure && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-gold/40 bg-gold/[0.08] p-4 text-[0.9rem] text-foreground"
          >
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4 text-gold" aria-hidden />
              {str(content, "error_title", "That didn't send.")}
            </p>
            <p className="mt-2 text-gray-mid">{failure}</p>
            <p className="mt-2 text-gray-mid">
              Reach us on{" "}
              <a className="text-cyan underline" href={waUrl} target="_blank" rel="noreferrer">
                WhatsApp ({waNumber})
              </a>{" "}
              or{" "}
              <a className="text-cyan underline" href={`mailto:${email}`}>
                {email}
              </a>
              . Your answers below are untouched.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={trackId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="mt-6 grid gap-5 sm:grid-cols-2"
          >
            {track.fields.map((f) => (
              <FieldControl
                key={f.key}
                field={f}
                value={form[f.key] ?? ""}
                error={errors[f.key]}
                onChange={(v) => set(f.key, v)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Honeypot — visually and semantically hidden from people. Not
            labeled "Company"/similar: that's a real autofill-recognized
            category, and browsers have been known to fill it despite
            autocomplete="off", which silently discards a genuine
            submission (the honeypot branch returns success without ever
            saving anything). A name/id with no autofill meaning avoids that. */}
        <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <input
            id="cf-hp"
            name="cf-hp"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {assurances.length > 0 ? (
          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-foreground/10 pt-5">
            {assurances.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 text-[0.78rem] text-gray-mid"
              >
                <Check className="size-3.5 text-cyan" aria-hidden />
                {a}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-sm text-[0.78rem] leading-relaxed text-gray-mid">
            {str(
              content,
              "form_note",
              "Your inquiry goes straight to the AstroBot inbox — no email app needed.",
            )}
          </p>
          <button
            type="submit"
            disabled={state === "sending"}
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-navy-950 transition hover:brightness-110 disabled:opacity-60"
          >
            {state === "sending" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {track.submitLabel} →
          </button>
        </div>
      </div>
    </motion.form>
  );
}

/* ── Controls ──────────────────────────────────────────────────────────── */

function FieldControl({
  field,
  value,
  error,
  onChange,
}: {
  field: Field;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  const id = `cf-${field.key}`;
  const border = error ? "border-gold/70" : "border-foreground/14";
  return (
    <div className={field.full || field.kind === "textarea" ? "sm:col-span-2" : undefined}>
      <Label htmlFor={id} required={field.required}>
        {field.label}
      </Label>

      {field.kind === "textarea" ? (
        <textarea
          id={id}
          rows={5}
          value={value}
          placeholder={field.placeholder}
          data-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} resize-y ${border}`}
        />
      ) : field.kind === "select" ? (
        <select
          id={id}
          value={value}
          data-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} ${border}`}
        >
          <option value="">Select…</option>
          {field.options?.map((o) => (
            <option key={o} value={o} className="bg-navy-950">
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.kind}
          value={value}
          placeholder={field.placeholder}
          autoComplete={field.autoComplete}
          data-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputBase} ${border}`}
        />
      )}

      <FieldError id={id} message={error} />
    </div>
  );
}

function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block font-mono text-[0.62rem] uppercase tracking-[0.22em] text-gray-mid"
    >
      {children}
      {required ? <span className="ml-1 text-gold">*</span> : null}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.78rem] text-gold">
      {message}
    </p>
  );
}

/* ── Direct channel cards (light band) ─────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChannelCards({ content }: { content: Record<string, any> }) {
  const site = useSiteContent();
  const waUrl = setting(site.settings, "whatsapp_url", "https://wa.me/923145978068");
  const waNumber = setting(site.settings, "whatsapp", "+92 314 5978068");
  const email = setting(site.settings, "contact_email", "contact@astrobotacademy.com");
  const address = setting(
    site.settings,
    "address",
    "NICAT-NASTP Alpha, Old Airport Road, Rawalpindi",
  );

  const cards = [
    {
      icon: MessageCircle,
      label: str(content, "whatsapp_label", "WhatsApp"),
      value: waNumber,
      note: str(content, "whatsapp_note", ""),
      badge: str(content, "whatsapp_badge", "Fastest"),
      href: waUrl,
      external: true,
    },
    {
      icon: Mail,
      label: str(content, "email_label", "Email"),
      value: email,
      note: str(content, "email_note", ""),
      badge: "",
      href: `mailto:${email}`,
      external: false,
    },
    {
      icon: MapPin,
      label: str(content, "visit_label", "Visit"),
      value: address,
      note: str(content, "visit_note", ""),
      badge: "",
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
      external: true,
    },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      className="mt-12 grid gap-5 md:grid-cols-3"
    >
      {cards.map((c) => (
        <motion.a
          key={c.label}
          variants={fadeUp}
          href={c.href}
          {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})}
          className="group flex min-h-[11rem] flex-col rounded-2xl border border-navy-950/12 bg-white/70 p-6 transition hover:-translate-y-0.5 hover:border-navy-950/30 hover:shadow-lg"
        >
          <div className="flex items-center justify-between">
            <c.icon className="size-5 text-navy-900" aria-hidden />
            {c.badge ? (
              <span className="rounded-full bg-gold/20 px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-navy-950">
                {c.badge}
              </span>
            ) : null}
          </div>
          <p className="mt-5 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-navy-900/60">
            {c.label}
          </p>
          <p className="mt-1.5 font-display text-[1.05rem] font-semibold leading-snug text-navy-950">
            {c.value}
          </p>
          {c.note ? (
            <p className="mt-2 text-[0.85rem] leading-relaxed text-navy-900/70">{c.note}</p>
          ) : null}
          <span className="mt-auto inline-flex items-center gap-1.5 pt-4 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-navy-900/70 transition group-hover:text-navy-950">
            Open
            <ArrowUpRight className="size-3.5" aria-hidden />
          </span>
        </motion.a>
      ))}
    </motion.div>
  );
}

/* ── Compact dark channel rail — sits beside the form in the hero ─────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ChannelRail({ content }: { content: Record<string, any> }) {
  const site = useSiteContent();
  const waUrl = setting(site.settings, "whatsapp_url", "https://wa.me/923145978068");
  const waNumber = setting(site.settings, "whatsapp", "+92 314 5978068");
  const email = setting(site.settings, "contact_email", "contact@astrobotacademy.com");
  const address = setting(
    site.settings,
    "address",
    "NICAT-NASTP Alpha, Old Airport Road, Rawalpindi",
  );

  const rows = [
    {
      icon: MessageCircle,
      label: str(content, "whatsapp_label", "WhatsApp"),
      value: waNumber,
      badge: str(content, "whatsapp_badge", "Fastest"),
      href: waUrl,
      external: true,
    },
    {
      icon: Mail,
      label: str(content, "email_label", "Email"),
      value: email,
      badge: "",
      href: `mailto:${email}`,
      external: false,
    },
    {
      icon: MapPin,
      label: str(content, "visit_label", "Office"),
      value: address,
      badge: "",
      href: `https://maps.google.com/?q=${encodeURIComponent(address)}`,
      external: true,
    },
  ];

  return (
    <motion.div variants={stagger} className="mt-10 max-w-md space-y-2.5">
      {rows.map((r) => (
        <motion.a
          key={r.label}
          variants={fadeUp}
          href={r.href}
          {...(r.external ? { target: "_blank", rel: "noreferrer" } : {})}
          className="group flex items-start gap-3.5 rounded-xl border border-foreground/15 bg-navy-950/70 px-4 py-3.5 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.9)] backdrop-blur-md transition hover:border-cyan/45 hover:bg-navy-950/85"
        >
          <r.icon className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-gray-mid">
                {r.label}
              </span>
              {r.badge ? (
                <span className="rounded-full bg-gold/20 px-2 py-0.5 font-mono text-[0.52rem] uppercase tracking-[0.18em] text-gold">
                  {r.badge}
                </span>
              ) : null}
            </span>
            <span className="mt-1 block text-[0.9rem] leading-snug text-foreground">{r.value}</span>
          </span>
          <ArrowUpRight
            className="mt-0.5 size-3.5 shrink-0 text-gray-mid transition group-hover:text-cyan"
            aria-hidden
          />
        </motion.a>
      ))}
    </motion.div>
  );
}
