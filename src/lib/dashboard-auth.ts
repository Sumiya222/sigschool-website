import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isHardcodedSuperAdmin } from "@/lib/super-admin";

export type AppRole = "admin" | "school" | "instructor" | "cms";

export interface DashboardSession {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  schoolId: string | null;
}

type State =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "ready"; session: DashboardSession };

/**
 * Shared implementation behind useRequireRole/useRequireAnyRole — live
 * session + whitelist-approval + role + school-active verification, never
 * trusting a cached/client-only value. `required` undefined means "any of
 * the four roles is fine" (for pages like Account every signed-in dashboard
 * user should reach), rather than gating on one specific role.
 */
function useDashboardSession(required?: AppRole) {
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: "loading" });

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setState({ status: "unauthenticated" });
      navigate({ to: "/dashboard/login" });
      return;
    }

    // Hardcoded Super Admin bypass — has full access to every dashboard.
    if (isHardcodedSuperAdmin(user.email)) {
      const profileRes = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setState({
        status: "ready",
        session: {
          userId: user.id,
          email: user.email ?? "",
          fullName: (profileRes.data?.full_name as string | null) ?? null,
          role: required ?? "admin",
          schoolId: null,
        },
      });
      return;
    }

    // Hard-block: whitelist must currently be 'approved'.
    const wl = await supabase.rpc("check_whitelist", { _email: user.email ?? "" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wlRow: any = Array.isArray(wl.data) ? wl.data[0] : null;
    if (!wlRow || !wlRow.approved) {
      await forceSignOut("Your access has been revoked. Contact your administrator.");
      setState({ status: "unauthenticated" });
      return;
    }

    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role, school_id").eq("user_id", user.id),
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    ]);

    if (rolesRes.error || !rolesRes.data || rolesRes.data.length === 0) {
      await forceSignOut("Your access has been revoked. Contact your administrator.");
      setState({ status: "unauthenticated" });
      return;
    }
    const roles = rolesRes.data.map((r) => r.role as AppRole);
    const isAdmin = roles.includes("admin");
    if (required && !roles.includes(required) && !isAdmin) {
      navigate({ to: roleHome(roles[0]) });
      return;
    }
    const match =
      rolesRes.data.find((r) => r.role === required) ??
      rolesRes.data.find((r) => r.role === "admin") ??
      rolesRes.data[0];

    // Hard-block: if resolved role is 'school', the school must be active.
    if (match.role === "school" && match.school_id) {
      const { data: sc } = await supabase
        .from("schools")
        .select("is_active")
        .eq("id", match.school_id)
        .maybeSingle();
      if (!sc || sc.is_active !== true) {
        await forceSignOut(
          "Your school's access is currently inactive. Contact your administrator.",
        );
        setState({ status: "unauthenticated" });
        return;
      }
    }

    setState({
      status: "ready",
      session: {
        userId: user.id,
        email: user.email ?? "",
        fullName: (profileRes.data?.full_name as string | null) ?? null,
        role: match.role as AppRole,
        schoolId: match.school_id,
      },
    });
  }, [navigate, required]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await refresh();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setState({ status: "unauthenticated" });
        navigate({ to: "/dashboard/login" });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [refresh, navigate]);

  return state;
}

/**
 * Client-side auth + role gate for dashboard routes.
 * - If not signed in → redirect to /dashboard/login
 * - If signed in but role !== required → redirect to their own dashboard
 */
export function useRequireRole(required: AppRole) {
  return useDashboardSession(required);
}

/**
 * Same live session + whitelist-approval + school-active verification as
 * useRequireRole, but for pages any signed-in dashboard user (any of the
 * four roles) should reach — e.g. account settings — rather than one
 * specific role. Revoked-whitelist and deactivated-school users are still
 * force-signed-out exactly as everywhere else.
 */
export function useRequireAnyRole() {
  return useDashboardSession(undefined);
}

export function roleHome(
  role: AppRole,
): "/dashboard/admin" | "/dashboard/school" | "/dashboard/instructor" | "/dashboard/cms" {
  if (role === "admin") return "/dashboard/admin";
  if (role === "cms") return "/dashboard/cms";
  if (role === "school") return "/dashboard/school";
  return "/dashboard/instructor";
}

export function displayName(session: Pick<DashboardSession, "fullName" | "email">): string {
  const n = (session.fullName ?? "").trim();
  if (n) return n;
  return session.email.split("@")[0] ?? session.email;
}

export const ACCESS_MESSAGE_KEY = "astrobot.dashboard.access_message";

export async function forceSignOut(message: string) {
  try {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ACCESS_MESSAGE_KEY, message);
    }
  } catch {
    /* ignore */
  }
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.replace("/dashboard/login");
  }
}
