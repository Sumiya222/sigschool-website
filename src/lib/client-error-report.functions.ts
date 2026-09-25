import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().max(200),
  message: z.string().max(2000),
  stack: z.string().max(8000).nullable().optional(),
  path: z.string().max(500).optional(),
});

/**
 * Best-effort report of an unhandled client-side render error. Without
 * this, a render crash in production is visible only in whichever single
 * visitor's browser console happened to hit it — logging it here instead
 * puts it in the server-side log (Cloudflare's own Workers logs), a place
 * someone actually monitoring the site would see it.
 */
export const reportClientError = createServerFn({ method: "POST" })
  .inputValidator((data: z.input<typeof schema>) => schema.parse(data))
  .handler(async ({ data }) => {
    console.error("[client-render-error]", {
      name: data.name,
      message: data.message,
      path: data.path,
      stack: data.stack,
    });
    return { ok: true };
  });
