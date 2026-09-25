/**
 * Client-callable wrapper around getEmailContent() (src/lib/email-content.server.ts),
 * used only by the /email-preview route so it can show what the CMS content
 * actually looks like right now — not just the templates' hardcoded
 * fallback values. The content itself isn't sensitive (it's the same copy
 * already sent to every form submitter), but this still reads via the
 * service-role client to reach an unpublished page's sections, bypassing
 * RLS — so it's gated the same way every other CMS-editing server function
 * is, rather than left open to anyone who finds the URL.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEmailContent, type EmailContent } from "@/lib/email-content.server";

export const getEmailContentForPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EmailContent> => {
    const { data: allowed } = await context.supabase.rpc("can_edit_site");
    if (!allowed) throw new Error("Not authorised.");
    return getEmailContent();
  });
