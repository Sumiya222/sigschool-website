/**
 * Shared branded email sending (server-only).
 *
 * One HTML shell used for every outgoing email — admin notifications and
 * submitter auto-replies alike — so everything the site sends looks like it
 * came from the same place. Uses plain SMTP (via nodemailer) when
 * SMTP_HOST/SMTP_USER/SMTP_PASS are configured; callers should treat a no-op
 * (nothing configured, or a send failure) as normal and never let it block
 * the form submission it's attached to.
 */
import fs from "node:fs";
import path from "node:path";
import type React from "react";
import { EMAIL_FOOTER_BADGE_PNG_BASE64, EMAIL_HEADER_PNG_BASE64 } from "@/lib/email-images.server";
import { BRAND } from "@/lib/brand";

function ensureEnvLoaded(): void {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return;
  }
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  } catch (err) {
    console.error("[env] Failed to auto-load .env file:", err);
  }
}

export type EmailRow = {
  label: string;
  value: string;
  /**
   * Wraps the escaped value in a link (e.g. mailto:/tel:/wa.me). Never build
   * an <a> tag into `value` yourself — it will be escaped as literal text.
   */
  href?: string;
  /**
   * Converts literal newlines in `value` to <br/> — applied AFTER escaping,
   * so real markup typed by the sender can't ride along as live HTML.
   */
  preserveLineBreaks?: boolean;
};

export type EmailStep = {
  n: string;
  title: string;
  body: string;
};

export type BrandedEmailOptions = {
  to: string;
  subject: string;
  /** Hidden preview snippet shown next to the subject in the inbox list (Gmail/Outlook/Apple Mail). Falls back to the intro if omitted. */
  preheader?: string;
  /** Internal document tag shown in masthead, e.g. "Inquiry Desk · AB / CNT · Parent". */
  docRef?: string;
  /** Small colored pill above the heading, e.g. "MESSAGE RECEIVED". Optional. */
  statusLabel?: string;
  statusColor?: string;
  statusBg?: string;
  heading: string;
  /** Paragraph under the heading. */
  intro: string;
  /** Optional title for the details panel (e.g. "What you sent us"). Defaults to "Record Details". */
  panelTitle?: string;
  /** Optional label/value details table. */
  rows?: EmailRow[];
  /** Optional step-by-step next steps sequence (Step 01, Step 02, Step 03). */
  steps?: EmailStep[];
  ctaLabel?: string;
  ctaUrl?: string;
  /** Human sign-off shown before the footer, e.g. "The Northbridge Prep Team". */
  signOff?: string;
  footerNote?: string;
  /** Unique reference ID, e.g. "INQ-2026-0184". */
  referenceId?: string;
  /** Plain-text fallback for clients that don't render HTML. */
  text: string;
};

const DEFAULT_STATUS_COLOR = "#4f46e5";
const DEFAULT_STATUS_BG = "#eef0fd";
const DEFAULT_FOOTER = `${BRAND.name} · ${BRAND.addressLine}`;

// A healthy SMTP handshake+send or Resend API call normally completes in a
// couple of seconds at most. 10s is a generous multiple of that — enough to
// absorb real network jitter without ever tripping on a healthy send — while
// still bounding how long a form submission can be held open if the mail
// provider hangs instead of erroring or timing out on its own.
const SEND_TIMEOUT_MS = 10_000;

/**
 * Races a promise against a fixed timeout. Used where the underlying client
 * (the Resend SDK) doesn't accept an AbortSignal — this can't cancel the
 * in-flight request, but it stops us from waiting on it, which is what
 * actually matters for not holding a visitor's submission open. The
 * existing caller-side try/catch treats a timeout exactly like any other
 * send failure: logged, swallowed, submission unaffected.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * HTML-entity escape. This is the ONLY place user-submitted content becomes
 * part of an outgoing email's HTML — every value buildHtml() interpolates
 * goes through this first, so a caller can never forget to escape.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtml(opts: BrandedEmailOptions): string {
  const statusColor = opts.statusColor ?? DEFAULT_STATUS_COLOR;
  const statusBg = opts.statusBg ?? DEFAULT_STATUS_BG;

  const heading = escapeHtml(opts.heading);
  const intro = escapeHtml(opts.intro);
  const docRef = opts.docRef ? escapeHtml(opts.docRef) : undefined;
  const statusLabel = opts.statusLabel ? escapeHtml(opts.statusLabel) : undefined;
  const signOff = opts.signOff ? escapeHtml(opts.signOff) : undefined;
  const footerNote = escapeHtml(opts.footerNote ?? DEFAULT_FOOTER);
  const referenceId = opts.referenceId ? escapeHtml(opts.referenceId) : undefined;
  const preheader = escapeHtml(opts.preheader ?? opts.intro);
  const ctaLabel = opts.ctaLabel ? escapeHtml(opts.ctaLabel) : undefined;
  const ctaUrl = opts.ctaUrl ? escapeHtml(opts.ctaUrl) : undefined;
  const panelTitle = escapeHtml(opts.panelTitle ?? "Submission Record");

  const row = (r: EmailRow) => {
    let value = escapeHtml(r.value);
    if (r.preserveLineBreaks) value = value.replace(/\n/g, "<br/>");
    if (r.href) {
      value = `<a href="${escapeHtml(r.href)}" style="color:#4f46e5;text-decoration:none;">${value}</a>`;
    }
    return `
    <tr>
      <td class="row-label" style="padding:8px 0;border-bottom:1px solid #e2e4ef;font-family:'SFMono-Regular',Menlo,Consolas,Courier,monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#6b708d;white-space:nowrap;vertical-align:top;width:120px;">${escapeHtml(r.label)}</td>
      <td class="row-value" style="padding:8px 0 8px 14px;border-bottom:1px solid #e2e4ef;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#12142b;vertical-align:top;line-height:1.5;">${value}</td>
    </tr>`;
  };

  const step = (s: EmailStep) => {
    return `
    <div style="margin-bottom:16px;">
      <div style="font-family:'SFMono-Regular',Menlo,Consolas,Courier,monospace;font-size:10px;font-weight:700;letter-spacing:0.2em;color:#4f46e5;text-transform:uppercase;margin-bottom:2px;">STEP ${escapeHtml(s.n)}</div>
      <div class="heading-text" style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#12142b;margin-bottom:3px;">${escapeHtml(s.title)}</div>
      <div class="intro-text" style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#4b5068;">${escapeHtml(s.body)}</div>
    </div>`;
  };

  const docRefHtml = docRef
    ? `<div style="padding:12px 32px 0 32px;font-family:'SFMono-Regular',Menlo,Consolas,Courier,monospace;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#8a8fa8;">${docRef}</div>`
    : "";

  const statusHtml = statusLabel
    ? `<div style="margin-bottom:14px;"><span style="display:inline-block;background-color:${statusBg};color:${statusColor};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;padding:5px 12px;border-radius:999px;">${statusLabel}</span></div>`
    : "";

  const rowsHtml =
    opts.rows && opts.rows.length > 0
      ? `<tr>
          <td style="padding:12px 32px 16px 32px;">
            <div class="panel-bg" style="background-color:#f7f4ec;border:1px solid #e4e5ef;border-radius:10px;padding:16px 20px;">
              <div style="font-family:'SFMono-Regular',Menlo,Consolas,Courier,monospace;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#4b5068;margin-bottom:10px;">${panelTitle}</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${opts.rows.map(row).join("")}</table>
            </div>
          </td>
        </tr>`
      : "";

  const stepsHtml =
    opts.steps && opts.steps.length > 0
      ? `<tr>
          <td style="padding:16px 32px 8px 32px;">
            <div style="font-family:'SFMono-Regular',Menlo,Consolas,Courier,monospace;font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:#4f46e5;margin-bottom:14px;">WHAT HAPPENS NEXT</div>
            ${opts.steps.map(step).join("")}
          </td>
        </tr>`
      : "";

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding:18px 32px 8px 32px;"><a href="${ctaUrl}" style="display:inline-block;background-color:#4f46e5;color:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:9px;">${ctaLabel} →</a></td></tr>`
      : "";

  const signOffHtml = signOff
    ? `<tr>
        <td style="padding:24px 32px 4px 32px;">
          <p class="signoff-lead" style="margin:0 0 3px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#6a6e91;">Warm regards,</p>
          <p class="signoff-name" style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#0b0e2a;">${signOff}</p>
        </td>
      </tr>`
    : `<tr><td style="height:8px;"></td></tr>`;

  const refHtml = referenceId
    ? `<p style="margin:8px 0 0 0;font-family:'SFMono-Regular',Menlo,Consolas,Courier,monospace;font-size:10px;letter-spacing:0.14em;color:#a3a7bd;">REFERENCE: ${referenceId}</p>`
    : "";

  return `
<!doctype html>
<html>
  <head>
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <style>
      /* Default (light) colors live inline on each element below, as a
         fallback for clients that strip <style> blocks entirely. Clients
         that DO support prefers-color-scheme get these deliberate dark
         values instead of whatever automatic re-coloring they'd otherwise
         apply — the header/footer logos are separate flattened images so
         they're unaffected either way. */
      @media (prefers-color-scheme: dark) {
        .email-bg { background-color: #05060f !important; }
        .card-bg { background-color: #12142c !important; border-color: #262a4d !important; }
        .panel-bg { background-color: #1a1c38 !important; border-color: #2b2f56 !important; }
        .heading-text { color: #f4f5ff !important; }
        .intro-text { color: #a9adcf !important; }
        .row-label { color: #8388b0 !important; border-color: #2b2f56 !important; }
        .row-value { color: #e7e8f6 !important; border-color: #2b2f56 !important; }
        .signoff-lead { color: #a9adcf !important; }
        .signoff-name { color: #f4f5ff !important; }
        .footer-bg { background-color: #0c0e22 !important; border-color: #262a4d !important; }
        .footer-note { color: #9296bd !important; }
        .footer-link { color: #8fb3ff !important; }
      }
    </style>
  </head>
  <body class="email-bg" style="margin:0;padding:0;background-color:#f2f3f9;">
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;font-size:1px;line-height:1px;color:#f2f3f9;">
      ${preheader}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background-color:#f2f3f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" class="card-bg" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e8f2;">
            <tr>
              <td style="line-height:0;font-size:0;background-color:#08081a;">
                <img
                  src="cid:astrobot-header"
                  alt="${BRAND.name}"
                  width="560"
                  style="display:block;width:100%;max-width:560px;height:auto;border:0;"
                />
                <div style="height:3px;background-color:#22d3ee;line-height:3px;font-size:1px;"></div>
              </td>
            </tr>
            ${docRefHtml ? `<tr><td>${docRefHtml}</td></tr>` : ""}
            <tr>
              <td style="padding:24px 32px 8px 32px;">
                ${statusHtml}
                <h1 class="heading-text" style="margin:0 0 10px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;line-height:1.2;color:#0b0e2a;">${heading}</h1>
                <p class="intro-text" style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#4b5068;">${intro}</p>
              </td>
            </tr>
            ${rowsHtml}
            ${stepsHtml}
            ${ctaHtml}
            ${signOffHtml}
            <tr>
              <td class="footer-bg" style="background-color:#f8f9fd;border-top:1px solid #eceef5;margin-top:16px;">
                <img
                  src="cid:astrobot-footer-badge"
                  alt="${BRAND.name}"
                  width="560"
                  style="display:block;width:100%;max-width:560px;height:auto;border:0;"
                />
                <div style="padding:0 32px 22px 32px;">
                  <p class="footer-note" style="margin:0 0 6px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#8a8fa8;">${footerNote}</p>
                  <p style="margin:0 0 4px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8a8fa8;">
                    ${BRAND.name} · ${BRAND.addressLine} · <a href="https://${BRAND.domain}" class="footer-link" style="color:#4f46e5;text-decoration:none;">${BRAND.domain}</a>
                  </p>
                  <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;color:#a3a7bd;">
                    ${BRAND.legalName}
                  </p>
                  ${refHtml}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

type SmtpConfig = { host: string; user: string; pass: string; port: number; from: string };

/** Resolves SMTP config from process.env, loading .env as a fallback first.
 * Returns null (and logs why) if credentials aren't available — the shared
 * "missing config" gate for every send path below. */
function resolveSmtpConfig(to: string): SmtpConfig | null {
  ensureEnvLoaded();
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    console.warn(
      `[email] Skipping send to ${to}: Missing SMTP credentials in process.env (SMTP_HOST: ${!!host}, SMTP_USER: ${!!user}, SMTP_PASS: ${!!pass})`,
    );
    return null;
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  const from = process.env.NOTIFY_EMAIL_FROM || user;
  return { host, user, pass, port, from };
}

async function createSmtpTransport(cfg: SmtpConfig) {
  const nodemailer = await import("nodemailer");
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    // nodemailer's own bounds for a hanging relay — see SEND_TIMEOUT_MS.
    // Not an AbortController (SMTP is a raw socket, not fetch), but the same
    // goal: never let a stalled connection/greeting/send hold things open.
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  });
}

/** Sends a branded email. Never throws — logs and returns on any failure or
 * missing SMTP config, so a caller can always fire-and-forget this. */
export async function sendBrandedEmail(opts: BrandedEmailOptions): Promise<void> {
  const cfg = resolveSmtpConfig(opts.to);
  if (!cfg) return;

  try {
    const transport = await createSmtpTransport(cfg);
    console.info(`[email] Sending email "${opts.subject}" to ${opts.to}...`);
    const info = await transport.sendMail({
      from: cfg.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: buildHtml(opts),
      attachments: [
        // Both are pre-flattened images — the logo's own background is baked
        // in (navy for the header, matching the footer's #f8f9fd for the
        // footer strip) rather than a styled <td> plus a separately-colored
        // logo on top, which read as a mismatched chip. It also means mail
        // clients' dark-mode color remapping (which only touches declared CSS
        // colors, not raster pixels) can't invert the background out from
        // under the logo.
        {
          filename: "header.png",
          content: Buffer.from(EMAIL_HEADER_PNG_BASE64, "base64"),
          cid: "astrobot-header",
        },
        {
          filename: "footer-badge.png",
          content: Buffer.from(EMAIL_FOOTER_BADGE_PNG_BASE64, "base64"),
          cid: "astrobot-footer-badge",
        },
      ],
    });
    console.info(`[email] Successfully sent email to ${opts.to}. Message ID: ${info.messageId}`);
  } catch (err) {
    console.error(`[email] Send to ${opts.to} failed:`, err);
  }
}

/**
 * Sends a submitter-facing confirmation email built from one of the
 * src/lib/email-templates/*.tsx React components, instead of the raw-HTML-
 * string builder above. React's own JSX rendering escapes every interpolated
 * value the same way it does in the browser, so there's no separate
 * escaping step to remember here. HTML and the plain-text fallback are both
 * rendered from the same component, so they can't drift apart.
 *
 * Sent via Resend rather than the SMTP relay used by sendBrandedEmail():
 * the SMTP host accepted every message we sent (real message IDs every
 * time) but none of them reached an external inbox — confirmed with two
 * separate Gmail addresses, a Yahoo address, and even a message sent
 * directly from the host's own webmail. That's a mail-server/deliverability
 * problem on the SMTP relay, not something fixable in this codebase, so
 * submitter-facing mail moved to a provider built for this specifically.
 * The admin-only alert (notifyRegistration) stays on the old SMTP path —
 * same-domain delivery there has actually been confirmed working.
 */
export async function sendReactEmail(opts: {
  to: string;
  subject: string;
  react: React.ReactElement;
  /** Sender identity Resend attaches to the message. Deliberately distinct
   * from the reply/contact address shown in the footer (which is a real,
   * monitored mailbox) — this one is conventionally "no reply" since the
   * footer already tells the recipient not to reply here and where to go
   * instead. */
  from?: string;
}): Promise<void> {
  ensureEnvLoaded();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] Skipping send to ${opts.to}: Missing RESEND_API_KEY in process.env`);
    return;
  }
  const from =
    opts.from || process.env.NOTIFY_EMAIL_FROM || `${BRAND.name} <noreply@${BRAND.domain}>`;

  try {
    const [{ render }, { Resend }] = await Promise.all([
      import("@react-email/render"),
      import("resend"),
    ]);
    const [html, text] = await Promise.all([
      render(opts.react),
      render(opts.react, { plainText: true }),
    ]);
    const resend = new Resend(apiKey);
    console.info(`[email] Sending email "${opts.subject}" to ${opts.to} via Resend...`);
    const result = await withTimeout(
      resend.emails.send({
        from,
        to: opts.to,
        subject: opts.subject,
        html,
        text,
      }),
      SEND_TIMEOUT_MS,
      `Resend send to ${opts.to}`,
    );
    if (result.error) {
      console.error(`[email] Resend send to ${opts.to} failed:`, result.error);
      return;
    }
    console.info(
      `[email] Successfully sent email to ${opts.to} via Resend. ID: ${result.data?.id}`,
    );
  } catch (err) {
    console.error(`[email] Send to ${opts.to} failed:`, err);
  }
}
