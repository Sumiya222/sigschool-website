import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/dashboard/reset-password")({
  head: () => ({
    meta: [{ title: "Set new password — Dashboard" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState<"checking" | "ok" | "no-session">("checking");

  useEffect(() => {
    // Supabase parses the recovery hash from the URL on load and emits PASSWORD_RECOVERY / SIGNED_IN.
    // Once we have a session (recovery-scoped), the user can call updateUser({password}).
    let cancelled = false;
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setReady(data.session ? "ok" : "no-session");
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady("ok");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("The two passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      setErr(error.message);
      return;
    }
    await supabase.auth.signOut();
    navigate({ to: "/dashboard/login" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" aria-label="Back to homepage">
            <Logo variant="light" className="h-11" />
          </Link>
          <h1 className="mt-4 font-display text-2xl font-semibold text-[color:var(--bp-ink)]">
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-[color:var(--bp-ink-2)]">
            After saving, you'll be sent back to the sign-in screen to log in with your new
            password.
          </p>
        </div>

        {ready === "checking" && (
          <div className="bp-panel p-6 text-center text-sm text-[color:var(--bp-ink-2)]">
            Verifying reset link…
          </div>
        )}
        {ready === "no-session" && (
          <div className="bp-panel p-6 text-center text-sm text-[color:var(--bp-ink-2)]">
            This reset link is invalid or has expired.{" "}
            <Link
              to="/dashboard/forgot-password"
              className="font-semibold text-[color:var(--bp-indigo)] hover:underline"
            >
              Request a new one
            </Link>
            .
          </div>
        )}
        {ready === "ok" && (
          <form onSubmit={onSubmit} className="bp-panel space-y-4 p-6">
            <div>
              <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
                New password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm"
              />
              <div className="mt-1 text-xs text-[color:var(--bp-muted)]">Minimum 8 characters.</div>
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 text-sm"
              />
            </div>
            {err && (
              <div className="rounded-md border border-[color:var(--bp-danger)] bg-[color:var(--bp-danger)]/10 px-3 py-2 text-sm text-[color:var(--bp-danger)]">
                {err}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-[color:var(--bp-indigo)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
