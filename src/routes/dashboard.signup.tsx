import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { roleHome, type AppRole } from "@/lib/dashboard-auth";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/dashboard/signup")({
  head: () => ({
    meta: [{ title: "Create account — Dashboard" }, { name: "robots", content: "noindex" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);

    const { data: check, error: checkErr } = await supabase.rpc("check_whitelist", {
      _email: email,
    });
    if (checkErr) {
      setBusy(false);
      setError(toSafeErrorMessage(checkErr, "Could not check whitelist status."));
      return;
    }
    const row = Array.isArray(check) ? check[0] : check;
    if (!row || !row.approved) {
      setBusy(false);
      setError(
        "This email hasn't been approved for dashboard access — contact your administrator.",
      );
      return;
    }

    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard/login` },
    });
    if (signErr || !data.user) {
      setBusy(false);
      setError(signErr?.message ?? "Signup failed.");
      return;
    }

    if (!data.session) {
      setBusy(false);
      navigate({ to: "/dashboard/login" });
      return;
    }

    const { data: r } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (r?.role) {
      navigate({ to: roleHome(r.role as AppRole) });
    } else {
      navigate({ to: "/dashboard/login" });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" aria-label="Back to homepage">
            <Logo variant="light" className="h-11" />
          </Link>
          <div className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--bp-muted)]">
            {BRAND.shortName} {BRAND.portalLabel}
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold text-[color:var(--bp-ink)]">
            Create dashboard account
          </h1>
          <p className="mt-2 text-sm text-[color:var(--bp-ink-2)]">
            Your email must be whitelisted by an administrator before you can sign up.
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="bp-panel space-y-4 p-6 shadow-[0_12px_40px_-24px_rgba(26,30,41,0.35)]"
        >
          <span className="bp-tick-tl" />
          <span className="bp-tick-tr" />
          <div>
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
              Password
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
          {error && (
            <div className="rounded-md border border-[color:var(--bp-danger)] bg-[color:var(--bp-danger)]/10 px-3 py-2 text-sm text-[color:var(--bp-danger)]">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[color:var(--bp-indigo)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Creating account…" : "Create account"}
          </button>
          <div className="pt-2 text-center text-xs text-[color:var(--bp-muted)]">
            Already have an account?{" "}
            <Link
              to="/dashboard/login"
              className="font-semibold text-[color:var(--bp-indigo)] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </form>
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--bp-muted)] hover:text-[color:var(--bp-ink)]"
          >
            ← Back to public site
          </Link>
        </div>
      </div>
    </div>
  );
}
