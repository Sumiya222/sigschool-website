import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/dashboard/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset password — Dashboard" }, { name: "robots", content: "noindex" }],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard/reset-password`,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg(
      "If that email is registered, a password reset link has been sent. Check your inbox (and spam folder) — the link will open a page where you can set a new password.",
    );
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
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-[color:var(--bp-ink-2)]">
            Enter the email you sign in with. We'll email you a secure link to set a new password.
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
          {err && (
            <div className="rounded-md border border-[color:var(--bp-danger)] bg-[color:var(--bp-danger)]/10 px-3 py-2 text-sm text-[color:var(--bp-danger)]">
              {err}
            </div>
          )}
          {msg && (
            <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {msg}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[color:var(--bp-indigo)] px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <div className="pt-2 text-center text-xs text-[color:var(--bp-muted)]">
            Remembered it?{" "}
            <Link
              to="/dashboard/login"
              className="font-semibold text-[color:var(--bp-indigo)] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
