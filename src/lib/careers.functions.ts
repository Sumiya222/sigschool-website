import { createServerFn } from "@tanstack/react-start";
import type { JobOpening } from "@/lib/careers.shared";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getClientIp, isOriginUnverified, ORIGIN_UNVERIFIED_MESSAGE } from "@/lib/get-client-ip";
import {
  applicationSchema,
  cvUrlSchema,
  listOpenRoles,
  signCv,
  storeApplication,
  type ApplicationInput,
  type SubmitResult,
} from "@/lib/careers.server";

export const getJobOpenings = createServerFn({ method: "GET" }).handler(
  async (): Promise<JobOpening[]> => listOpenRoles(),
);

export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((data: ApplicationInput) => applicationSchema.parse(data))
  .handler(async ({ data }): Promise<SubmitResult> => {
    // Origin-lock stopgap: reject requests that bypassed Cloudflare entirely
    // (no CF-Connecting-IP) — see get-client-ip.ts for why this is only a
    // partial mitigation, not a substitute for the real server-level fix.
    if (isOriginUnverified()) {
      return { ok: false, reason: ORIGIN_UNVERIFIED_MESSAGE };
    }

    const ip = getClientIp();
    return storeApplication(data, ip);
  });

export const getApplicationCvUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string }) => cvUrlSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { error: "Not authorised." };
    return signCv(data.applicationId);
  });
