/**
 * Shared visual language for every AstroBot Academy email.
 *
 * Mirrors the site: near-black navy masthead, electric-indigo accent, cyan
 * hairline, mono eyebrow labels. Email clients only reliably support inline
 * styles, so everything here is a plain style object.
 *
 * Content passed as JSX children (Row values, Step bodies, etc.) is escaped
 * automatically by React's own rendering — the same guarantee normal JSX
 * gives you in the browser — so there is no separate escaping step needed
 * here the way the old raw-HTML-string template required.
 */
import React from "react";
import {
  Body,
  Column as ColumnLayout,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row as RowLayout,
  Section,
  Text,
} from "@react-email/components";

export const brand = {
  navy: "#08081a",
  navy800: "#1a1a44",
  indigo: "#4f46e5",
  indigoSoft: "#eef0ff",
  cyan: "#22d3ee",
  ink: "#12142b",
  ink2: "#4b5068",
  line: "#e4e5ef",
  paper: "#f7f4ec",
};

const sans = "'Helvetica Neue', Helvetica, Arial, 'Segoe UI', sans-serif";
const mono = "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";

export const s = {
  main: { backgroundColor: "#ffffff", fontFamily: sans, margin: 0, padding: "0" },
  wrap: { width: "100%", backgroundColor: "#f2f2f6", padding: "28px 0" },
  container: {
    width: "100%",
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    overflow: "hidden",
    border: `1px solid ${brand.line}`,
  },
  masthead: { backgroundColor: brand.navy, padding: "26px 32px 22px" },
  mastheadRule: { height: "3px", backgroundColor: brand.cyan, lineHeight: "3px", fontSize: "1px" },
  docref: {
    margin: "10px 0 0",
    color: "#8f93b5",
    fontFamily: mono,
    fontSize: "10px",
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
  },
  body: { padding: "30px 32px 8px" },
  eyebrow: {
    margin: "0 0 10px",
    color: brand.indigo,
    fontFamily: mono,
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.26em",
    textTransform: "uppercase" as const,
  },
  h1: {
    margin: "0 0 14px",
    color: brand.ink,
    fontSize: "26px",
    lineHeight: "1.15",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  p: { margin: "0 0 14px", color: brand.ink2, fontSize: "15px", lineHeight: "1.65" },
  strongP: { margin: "0 0 14px", color: brand.ink, fontSize: "15px", lineHeight: "1.65" },
  panel: {
    margin: "6px 0 20px",
    padding: "18px 20px",
    backgroundColor: brand.paper,
    border: `1px solid ${brand.line}`,
    borderRadius: "10px",
  },
  panelTitle: {
    margin: "0 0 12px",
    color: brand.ink,
    fontFamily: mono,
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.24em",
    textTransform: "uppercase" as const,
  },
  rowLabel: {
    margin: 0,
    color: brand.ink2,
    fontFamily: mono,
    fontSize: "10px",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
  },
  rowValue: { margin: "2px 0 12px", color: brand.ink, fontSize: "14px", lineHeight: "1.5" },
  steps: { margin: "0 0 8px", padding: 0 },
  cta: {
    display: "inline-block",
    backgroundColor: brand.indigo,
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: 700,
    textDecoration: "none",
    padding: "13px 24px",
    borderRadius: "9px",
  },
  ghost: {
    display: "inline-block",
    color: brand.indigo,
    fontSize: "13px",
    fontWeight: 600,
    textDecoration: "none",
    padding: "12px 0",
  },
  hr: { borderColor: brand.line, margin: "24px 0 18px" },
  footer: { padding: "0 32px 30px" },
  footerText: { margin: "0 0 6px", color: "#8a8fa8", fontSize: "12px", lineHeight: "1.6" },
  ref: {
    margin: "12px 0 0",
    color: "#a3a7bd",
    fontFamily: mono,
    fontSize: "10px",
    letterSpacing: "0.14em",
  },
  mono,
};

export const SITE = "https://astrobotacademy.com";
/**
 * Hosted, not embedded as a base64 data URI: several major mail clients
 * (Gmail included) don't reliably render inline `data:` image sources in
 * received mail, even though they render fine in local preview. A real,
 * publicly reachable URL is the only approach that works across clients —
 * standard practice for every commercial email service.
 *
 * Served from the same public site-media Storage bucket the Media Library
 * already uses (not a bundled public/ file), so these are live immediately
 * and don't depend on the app being redeployed.
 */
const MEDIA_BASE = "https://asxwugnxcjiuituwpkyi.supabase.co/storage/v1/object/public/site-media";
export const LOGO_URL = `${MEDIA_BASE}/email-assets/logo.png`;
export const ROCKET_URL = `${MEDIA_BASE}/email-assets/rocket-black.png`;
/**
 * Fallbacks below mirror src/lib/email-content.server.ts's
 * DEFAULT_EMAIL_CONTENT. This file has to stay client-safe (it's rendered
 * in-browser by the /email-preview route), so it can't import that
 * server-only module directly — keep the two in sync by hand if either
 * changes.
 */
export const CONTACT_EMAIL = "info@astrobotacademy.com";
export const WHATSAPP_URL = "https://wa.me/923145978068";
export const FOOTER_NOTICE = "This inbox isn't monitored, so replies here won't reach us.";
export const CONTACT_LINE = `For anything else, message us on WhatsApp or write to ${CONTACT_EMAIL}.`;
export const ADDRESS_LINE =
  "AstroBot Academy · NICAT–NASTP Alpha, Rawalpindi · astrobotacademy.com";
export const LEGAL_LINE =
  "Stellar Scholar Space Education Initiative · Stelalliance (SMC-Private) Ltd";

export type EmailStep = { n: string; title: string; body: string };

/** Renders a CMS-editable sentence with any of the given substrings turned
 * into links wherever they appear — lets the surrounding wording stay a
 * plain text field without needing a token/placeholder system for embedded
 * links. Matches are found independently and rendered left to right;
 * overlapping matches keep whichever starts first. */
export function AutoLinkText({
  text,
  links,
}: {
  text: string;
  links: { match: string; href: string }[];
}) {
  type Found = { start: number; end: number; href: string; label: string };
  const found: Found[] = [];
  for (const { match, href } of links) {
    if (!match) continue;
    const idx = text.indexOf(match);
    if (idx === -1) continue;
    found.push({ start: idx, end: idx + match.length, href, label: match });
  }
  found.sort((a, b) => a.start - b.start);
  const nonOverlapping: Found[] = [];
  let lastEnd = -1;
  for (const f of found) {
    if (f.start >= lastEnd) {
      nonOverlapping.push(f);
      lastEnd = f.end;
    }
  }
  if (nonOverlapping.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  nonOverlapping.forEach((f, i) => {
    if (f.start > cursor) parts.push(text.slice(cursor, f.start));
    parts.push(
      <Link key={i} href={f.href} style={{ color: brand.indigo, textDecoration: "none" }}>
        {f.label}
      </Link>,
    );
    cursor = f.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

/** Thin convenience wrapper over AutoLinkText for the common single-link
 * case (the per-template closing WhatsApp lines). */
export function WhatsAppText({ text, whatsappUrl }: { text: string; whatsappUrl: string }) {
  return <AutoLinkText text={text} links={[{ match: "WhatsApp", href: whatsappUrl }]} />;
}

export function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </>
  );
}

/** Colored status badge shown at the top of the body, e.g. "Seat confirmed"
 * or "Waitlisted" — the pill treatment the old raw-HTML template used for
 * statusLabel, restored here for the React templates. */
export function Pill({
  label,
  color = brand.indigo,
  bg = brand.indigoSoft,
}: {
  label: string;
  color?: string;
  bg?: string;
}) {
  return (
    <Section style={{ marginBottom: "14px" }}>
      <span
        style={{
          display: "inline-block",
          backgroundColor: bg,
          color,
          fontFamily: sans,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
          padding: "5px 12px",
          borderRadius: "999px",
        }}
      >
        {label}
      </span>
    </Section>
  );
}

export function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <Section style={{ marginBottom: "14px" }}>
      <Text style={{ ...s.rowLabel, color: brand.indigo }}>{`Step ${n}`}</Text>
      <Text style={{ margin: "2px 0 3px", color: brand.ink, fontSize: "15px", fontWeight: 700 }}>
        {title}
      </Text>
      <Text style={{ margin: 0, color: brand.ink2, fontSize: "14px", lineHeight: "1.6" }}>
        {body}
      </Text>
    </Section>
  );
}

export function Shell({
  preview,
  docRef,
  children,
  footerNote,
  reference,
  whatsappUrl = WHATSAPP_URL,
  contactEmail = CONTACT_EMAIL,
  footerNotice = FOOTER_NOTICE,
  contactLine = CONTACT_LINE,
  addressLine = ADDRESS_LINE,
  legalLine = LEGAL_LINE,
}: {
  preview: string;
  docRef: string;
  children: React.ReactNode;
  footerNote?: string;
  reference?: string;
  whatsappUrl?: string;
  contactEmail?: string;
  footerNotice?: string;
  contactLine?: string;
  addressLine?: string;
  legalLine?: string;
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={s.main}>
        <Section style={s.wrap}>
          <Container style={s.container}>
            <Section style={s.masthead}>
              <Img
                src={LOGO_URL}
                width="120"
                height="33"
                alt="AstroBot Academy"
                style={{ display: "block" }}
              />
              <Text style={s.docref}>{docRef}</Text>
            </Section>
            <Section style={s.mastheadRule} />
            <Section style={s.body}>{children}</Section>
            <Section style={s.footer}>
              <Hr style={s.hr} />
              <RowLayout>
                <ColumnLayout style={{ verticalAlign: "bottom" as const }}>
                  {footerNotice ? (
                    <Text style={{ ...s.footerText, color: brand.ink2, fontWeight: 700 }}>
                      {footerNotice}
                    </Text>
                  ) : null}
                  {contactLine ? (
                    <Text style={s.footerText}>
                      <AutoLinkText
                        text={contactLine}
                        links={[
                          { match: "WhatsApp", href: whatsappUrl },
                          { match: contactEmail, href: `mailto:${contactEmail}` },
                        ]}
                      />
                    </Text>
                  ) : null}
                  {footerNote ? <Text style={s.footerText}>{footerNote}</Text> : null}
                  {addressLine ? (
                    <Text style={s.footerText}>
                      <AutoLinkText
                        text={addressLine}
                        links={[{ match: "astrobotacademy.com", href: SITE }]}
                      />
                    </Text>
                  ) : null}
                  {legalLine ? <Text style={s.footerText}>{legalLine}</Text> : null}
                  {reference ? <Text style={s.ref}>{reference}</Text> : null}
                </ColumnLayout>
                <ColumnLayout
                  style={{ width: "40px", verticalAlign: "bottom" as const }}
                  align="right"
                >
                  <Img
                    src={ROCKET_URL}
                    width="22"
                    height="25"
                    alt=""
                    style={{ display: "block", marginLeft: "auto" }}
                  />
                </ColumnLayout>
              </RowLayout>
            </Section>
          </Container>
        </Section>
      </Body>
    </Html>
  );
}
