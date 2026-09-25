/**
 * Single source of truth for is_safe_link_target()'s contract, shared by
 * both implementations' test:
 *   - SQL: public.is_safe_link_target (supabase/migrations/..., the real
 *     security boundary — enforced by CHECK constraints on page_sections,
 *     camp_window and job_applications)
 *   - TS: isSafeLinkTarget in src/lib/link-target.ts (display-side guard in
 *     the admin dashboard)
 *
 * Add a case here once and both implementations get tested against it —
 * see tests/link-target-parity.test.mjs.
 */
export type LinkTargetCase = {
  label: string;
  input: string | null;
  expected: boolean;
};

export const LINK_TARGET_CASES: LinkTargetCase[] = [
  // --- Valid ---
  { label: "https URL", input: "https://example.com", expected: true },
  { label: "http URL", input: "http://example.com", expected: true },
  { label: "mailto", input: "mailto:person@example.com", expected: true },
  { label: "tel", input: "tel:+15551234567", expected: true },
  { label: "relative path", input: "/about", expected: true },
  { label: "bare slash", input: "/", expected: true },
  { label: "in-page anchor", input: "#open-roles", expected: true },
  { label: "query only", input: "?ref=footer", expected: true },
  { label: "empty string (no target set)", input: "", expected: true },
  { label: "null (no target set)", input: null, expected: true },
  { label: "uppercase scheme is still allowed", input: "HTTPS://example.com", expected: true },

  // --- Invalid ---
  { label: "javascript scheme", input: "javascript:alert(1)", expected: false },
  {
    label: "data scheme",
    input: "data:text/html,<script>alert(1)</script>",
    expected: false,
  },
  { label: "vbscript scheme", input: "vbscript:msgbox(1)", expected: false },
  { label: "file scheme", input: "file:///etc/passwd", expected: false },

  // --- Edge cases ---
  { label: "scheme-relative (protocol-relative) URL", input: "//evil.com", expected: false },
  {
    label: "leading space before dangerous scheme",
    input: "   javascript:alert(1)",
    expected: false,
  },
  { label: "leading tab before dangerous scheme", input: "\tjavascript:alert(1)", expected: false },
  {
    label: "leading newline before dangerous scheme",
    input: "\njavascript:alert(1)",
    expected: false,
  },
  { label: "mixed-case javascript scheme", input: "JaVaScRiPt:alert(1)", expected: false },
  {
    label: "URL-encoded javascript scheme (percent-encoding isn't a valid scheme prefix)",
    input: "%6a%61%76%61%73%63%72%69%70%74:alert(1)",
    expected: false,
  },
];
