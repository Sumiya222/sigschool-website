import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { verifyRowsAffected } from "@/lib/db-write-verify";

/** Find the auth.users id for a whitelist email, if that person has ever signed up. */
async function findUserIdByEmail(email: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = data?.users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
  return match?.id ?? null;
}

// Bounds how many updateUserById calls run at once. Supabase's Auth admin
// API has its own rate limits, so a large staff list shouldn't fire every
// request in parallel — this keeps a fixed number of workers in flight
// instead, each pulling the next id off the queue as it finishes.
const BAN_UPDATE_CONCURRENCY = 5;

/**
 * Applies the same ban_duration to every user id, with bounded concurrency
 * rather than sequentially or all at once. Never throws for an individual
 * failure — each outcome is reported back so the caller can tell a full
 * success from a partial one instead of getting a generic error or a false
 * "it worked" when some users were left in the old state.
 */
async function updateUsersBanStatus(
  userIds: string[],
  banDuration: string,
): Promise<{ succeeded: string[]; failed: { userId: string; error: string }[] }> {
  if (userIds.length === 0) return { succeeded: [], failed: [] };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const succeeded: string[] = [];
  const failed: { userId: string; error: string }[] = [];
  let next = 0;

  async function worker() {
    while (next < userIds.length) {
      const userId = userIds[next++];
      try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: banDuration,
        });
        if (error) failed.push({ userId, error: error.message });
        else succeeded.push(userId);
      } catch (err) {
        failed.push({ userId, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(BAN_UPDATE_CONCURRENCY, userIds.length) }, () => worker()),
  );
  return { succeeded, failed };
}

/**
 * Admin-only: change ANY whitelist entry's status (any role — admin, cms,
 * school, or instructor) AND, when revoking, ban the user in Supabase Auth so
 * their refresh token stops working immediately instead of remaining valid
 * (though already useless for data access, since RLS re-checks the whitelist
 * live on every query regardless of this ban).
 *
 * The whitelist UPDATE itself runs under the caller's own session (via
 * context.supabase), so the existing enforce_super_admin_rules trigger still
 * applies exactly as before — a regular admin still cannot touch an admin/cms
 * row here either.
 */
export const adminSetWhitelistStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "revoked", "pending"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Only admins can change whitelist status");

    const { data: row, error: rowErr } = await context.supabase
      .from("whitelist")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (rowErr) throw new Error(rowErr.message);
    if (!row) throw new Error("Whitelist entry not found");

    const { error: updErr } = await verifyRowsAffected(
      context.supabase.from("whitelist").update({ status: data.status }).eq("id", data.id),
    );
    if (updErr) throw new Error(updErr.message);

    const targetId = await findUserIdByEmail(row.email);
    if (targetId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const banDuration = data.status === "revoked" ? "876000h" : "none";
      await supabaseAdmin.auth.admin.updateUserById(targetId, { ban_duration: banDuration });
    }
    return { ok: true };
  });

/**
 * Admin-only: delete a whitelist entry entirely AND ban the corresponding
 * user the same way a revoke does, so removing someone's access this way
 * doesn't leave their refresh token alive either.
 */
export const adminDeleteWhitelistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Only admins can delete whitelist entries");

    const { data: row, error: rowErr } = await context.supabase
      .from("whitelist")
      .select("email")
      .eq("id", data.id)
      .maybeSingle();
    if (rowErr) throw new Error(rowErr.message);
    if (!row) throw new Error("Whitelist entry not found");

    const { error: delErr } = await verifyRowsAffected(
      context.supabase.from("whitelist").delete().eq("id", data.id),
    );
    if (delErr) throw new Error(delErr.message);

    const targetId = await findUserIdByEmail(row.email);
    if (targetId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.auth.admin.updateUserById(targetId, { ban_duration: "876000h" });
    }
    return { ok: true };
  });

/**
 * Admin-only: set an instructor's whitelist status AND, when revoking,
 * ban the user in Supabase Auth so their existing JWT / refresh token
 * stops working server-side within one refresh cycle, instead of only
 * being caught by the client's next request via forceSignOut.
 *
 * On reapproval we clear the ban so the user can sign in again.
 */
export const adminSetInstructorStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        email: z.string().email(),
        status: z.enum(["approved", "revoked", "pending"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Authorize: caller must be admin (checked via RLS-safe helper).
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Only admins can change instructor status");

    // Apply the whitelist change under the admin's own privileges (RLS + audit).
    const { error: rpcErr } = await context.supabase.rpc("admin_set_instructor_status", {
      _email: data.email,
      _status: data.status,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    // Server-side session invalidation via Supabase Auth admin.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: byEmail } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const target = byEmail?.users.find(
      (u) => u.email && u.email.toLowerCase() === data.email.toLowerCase(),
    );
    if (target) {
      // ban_duration invalidates existing refresh tokens and blocks new sign-ins
      // until cleared. This closes the "valid JWT after revocation" window.
      const banDuration = data.status === "revoked" ? "876000h" : "none";
      await supabaseAdmin.auth.admin.updateUserById(target.id, {
        ban_duration: banDuration,
      });
    }
    return { ok: true };
  });

/**
 * Admin-only: toggle a school's is_active flag AND, when deactivating,
 * ban every "school"-role user whose active user_roles row points at that
 * school so their JWT is invalidated server-side immediately.
 *
 * Deliberately scoped to role = 'school', not every role sharing that
 * school_id. school_id is the real, authoritative scoping field for a
 * school-portal login (current_user_school_id() filters on it directly),
 * but it is NOT authoritative for an instructor -- real instructor access
 * is governed entirely by instructor_assignments, and per-school stays
 * NULL for instructor rows by design (see
 * 20260805000000_whitelist_multi_school_instructor.sql). Banning on it
 * anyway did real damage once already: a real instructor (Talha Baqir)
 * carried a stale non-null school_id from before that migration, one
 * school he'd long since moved off got deactivated, and his entire
 * account -- not just that school -- was banned for it, with no audit
 * trail explaining why (Supabase Auth bans aren't captured by this app's
 * own audit_log triggers). Even with a clean school_id, banning an
 * instructor's whole account over one school's status would still be
 * wrong the moment an instructor teaches at more than one school, which
 * that same migration exists specifically to support.
 */
export const adminSetSchoolActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ schoolId: z.string().uuid(), isActive: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Only admins can change school status");

    const { error: updErr } = await verifyRowsAffected(
      context.supabase.from("schools").update({ is_active: data.isActive }).eq("id", data.schoolId),
    );
    if (updErr) throw new Error(updErr.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("school_id", data.schoolId)
      .eq("role", "school");
    const userIds = (rows ?? []).map((r) => r.user_id).filter((id): id is string => Boolean(id));
    const banDuration = data.isActive ? "none" : "876000h";
    const { succeeded, failed } = await updateUsersBanStatus(userIds, banDuration);

    if (failed.length > 0) {
      // The school's is_active flag above already committed — this is a
      // partial failure of the follow-on ban propagation, not a failed
      // request, so it doesn't throw. The caller needs the specifics to
      // avoid reporting a clean success when some users were left banned
      // (or unbanned) in the old state.
      console.error(
        `adminSetSchoolActive: ${failed.length}/${userIds.length} user ban updates failed for school ${data.schoolId}`,
        failed,
      );
    }

    return {
      ok: true,
      usersUpdated: succeeded.length,
      usersFailed: failed.map((f) => f.userId),
    };
  });
