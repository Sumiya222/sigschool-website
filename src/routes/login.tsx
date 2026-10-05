import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { roleHome, type AppRole } from "@/lib/dashboard-auth";
import { isHardcodedSuperAdmin } from "@/lib/super-admin";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: `Login Portal | ${BRAND.name}` },
      { name: "description", content: "Secure access to The Signature School portal." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PortalLoginPage,
});

function PortalLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error || !result.data.user) {
      setError(result.error?.message ?? "Unable to sign in. Check your email and password.");
      setBusy(false);
      return;
    }

    const user = result.data.user;
    if (isHardcodedSuperAdmin(user.email)) {
      navigate({ to: roleHome("admin") });
      return;
    }

    const whitelist = await supabase.rpc("check_whitelist", { _email: user.email ?? "" });
    const whitelistRow = Array.isArray(whitelist.data) ? whitelist.data[0] : null;
    if (!whitelistRow || !whitelistRow.approved) {
      await supabase.auth.signOut();
      setError("Your account does not currently have portal access. Contact support.");
      setBusy(false);
      return;
    }

    const roles = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const role = roles.data?.role as AppRole | undefined;
    if (!role || !["admin", "cms", "school", "instructor"].includes(role)) {
      await supabase.auth.signOut();
      setError("No portal role is assigned to this account. Contact support.");
      setBusy(false);
      return;
    }

    if (!remember) window.sessionStorage.setItem("tss.session.only", "true");
    navigate({ to: roleHome(role) });
  }

  return (
    <div className="portal-page">
      <section className="portal-shell" aria-labelledby="portal-title">
        <div className="portal-welcome">
          <Logo variant="light" withWordmark={false} className="portal-mark" />
          <p className="portal-kicker">Signature School Portal</p>
          <h1>Welcome back.</h1>
          <p className="portal-welcome-copy">
            Sign in to access your learning journey, school updates and digital resources.
          </p>
          <div className="portal-audiences" aria-label="Portal users">
            <span>Students</span>
            <span>Parents</span>
            <span>Teachers</span>
          </div>
        </div>

        <div className="portal-form-panel">
          <p className="portal-kicker">Secure Sign In</p>
          <h2 id="portal-title">Login to your portal</h2>
          <p className="portal-form-intro">Use the email and password provided by your school.</p>
          <form onSubmit={submit} className="portal-form">
            <label htmlFor="portal-email">Email address</label>
            <input
              id="portal-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="portal-password">Password</label>
            <div className="portal-password">
              <input
                id="portal-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <div className="portal-form-options">
              <label>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember me
              </label>
              <Link to="/dashboard/forgot-password">Forgot password?</Link>
            </div>
            {error ? (
              <p className="portal-error" role="alert">
                {error}
              </p>
            ) : null}
            <button className="portal-submit" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Login to Portal"}
              {!busy ? <ArrowRight aria-hidden /> : null}
            </button>
          </form>
          <p className="portal-help">
            Need help accessing your account? <Link to="/support">Contact support</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
