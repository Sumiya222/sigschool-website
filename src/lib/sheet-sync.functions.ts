import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Admin-only controls for the Google Sheet archive mirror. */

export const retrySheetSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { error: "Not authorised." as const };

    const { retryPending } = await import("@/lib/sheet-sync.server");
    return retryPending(50);
  });

export const getSheetSyncHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { configured: false, error: "Not authorised." };

    const { sheetsConfigured } = await import("@/lib/sheets.server");
    return { configured: sheetsConfigured() };
  });
