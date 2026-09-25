/**
 * Google service-account auth (server-only).
 *
 * Signs a JWT with the service account's private key and exchanges it for a
 * short-lived OAuth access token, per Google's server-to-server flow:
 * https://developers.google.com/identity/protocols/oauth2/service-account
 *
 * No third-party auth library needed — Node's `crypto` does RS256 signing.
 */
import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// Google's token endpoint normally responds in well under a second. 8s is a
// generous multiple of that — enough to absorb real network jitter without
// ever tripping on a healthy call — while still bounding how long a form
// submission can be held open if the endpoint hangs instead of erroring.
const FETCH_TIMEOUT_MS = 8_000;

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function signAssertion(email: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = base64url(
    createSign("RSA-SHA256").update(`${header}.${claims}`).sign(privateKey),
  );
  return `${header}.${claims}.${signature}`;
}

/**
 * Some hosts' env-var UIs only accept escaped `\n`; others mangle or strip
 * real newlines from multi-line values entirely, leaving neither real nor
 * escaped newlines to recover. For that case, the key can instead be stored
 * base64-encoded (see docs/SETUP.md) — base64 has no newlines to lose, so it
 * survives any host's text field intact.
 */
function normalizePrivateKey(rawKey: string): string {
  const unescaped = rawKey.includes("\n") ? rawKey : rawKey.replace(/\\n/g, "\n");
  if (unescaped.includes("-----BEGIN")) return unescaped;
  try {
    const decoded = Buffer.from(rawKey.trim(), "base64").toString("utf8");
    if (decoded.includes("-----BEGIN")) return decoded;
  } catch {
    // fall through — return the unescaped value as-is below
  }
  return unescaped;
}

export function serviceAccountConfig(): {
  email: string;
  privateKey: string;
  sheetId: string;
} | null {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_ID?.trim();
  if (!email || !rawKey || !sheetId) return null;
  const privateKey = normalizePrivateKey(rawKey);
  return { email, privateKey, sheetId };
}

let cached: { token: string; expiresAt: number } | null = null;

/** Returns a valid access token, refreshing it once it's within 60s of expiry. */
export async function getAccessToken(): Promise<string> {
  const cfg = serviceAccountConfig();
  if (!cfg) throw new Error("Google service account is not configured.");

  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const assertion = signAssertion(cfg.email, cfg.privateKey);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(`Google token exchange failed [${res.status}]: ${text.slice(0, 500)}`);

  const data = JSON.parse(text) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cached.token;
}
