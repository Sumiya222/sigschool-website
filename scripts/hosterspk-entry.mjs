// Entry point cPanel's Node.js App / Passenger should actually run on
// HostersPK — NOT .output/server/index.mjs directly. It runs one check
// before starting the real server, then hands off to it unchanged.
//
// Why this check exists: srvx (the h3 runtime Nitro's node-server preset
// uses) passes `hostname: process.env.HOST` straight to Node's
// http.createServer().listen(). If HOST is unset, Node's default is to
// bind ALL interfaces, not just localhost. On shared hosting behind
// Apache/LiteSpeed + Passenger, that means the Node process becomes
// directly reachable from the internet, bypassing the reverse proxy
// entirely — which also bypasses whatever IP-forwarding header the proxy
// would otherwise set. src/lib/get-client-ip.ts's X-Forwarded-For fallback
// trusts the LAST entry on the assumption a trusted proxy appended it;
// with no proxy in the path, an attacker controls that value directly,
// reopening the exact spoofing hole this app was already patched for once
// (see the incident documented in get-client-ip.ts's own comment).
//
// This must be visible in the boot log, not discovered later via a
// spoofed-rate-limit incident — hence logging loudly here rather than
// silently, and before the server starts accepting traffic.
const host = process.env.HOST;
const isLocalhost = host === "127.0.0.1" || host === "localhost" || host === "::1";

if (!isLocalhost) {
  console.error(
    [
      "=".repeat(72),
      "[STARTUP CHECK FAILED] HOST is " +
        (host ? `set to "${host}"` : "UNSET") +
        ", not 127.0.0.1.",
      "",
      "This process will bind to all network interfaces instead of just",
      "localhost, making it directly reachable from the internet and",
      "bypassing the Apache/LiteSpeed reverse proxy entirely. That also",
      "bypasses the X-Forwarded-For header the proxy would otherwise set,",
      "re-opening a known IP-spoofing hole in rate limiting (see",
      "src/lib/get-client-ip.ts).",
      "",
      "Fix: set HOST=127.0.0.1 in the cPanel Node.js App's Environment",
      "Variables, then restart the app.",
      "=".repeat(72),
    ].join("\n"),
  );
}

// Copied into .output/server/ alongside index.mjs by the deploy workflow's
// build step, so this relative import resolves correctly on the server.
await import("./index.mjs");
