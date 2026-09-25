import { timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { runDailyDigest } from "@/lib/admin-digest.server";

/**
 * Called once a day by a Supabase pg_cron job (via pg_net) to run the admin
 * digest — see supabase/migrations/20260802030000_daily_admin_digest.sql.
 * Not tied to any user session; authenticated by a shared secret instead,
 * since the caller is Postgres, not a browser.
 */

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/send-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.DIGEST_CRON_SECRET;
        const provided = request.headers.get("x-digest-secret");
        if (!expected || !provided || !safeEqual(provided, expected)) {
          return jsonResponse({ error: "Unauthorized" }, 401);
        }

        try {
          const result = await runDailyDigest();
          return jsonResponse(result, 200);
        } catch (err) {
          console.error("daily digest run failed", err);
          return jsonResponse({ error: "Digest run failed" }, 500);
        }
      },
    },
  },
});
