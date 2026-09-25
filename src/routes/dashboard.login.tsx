import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { roleHome, type AppRole, ACCESS_MESSAGE_KEY } from "@/lib/dashboard-auth";
import { isHardcodedSuperAdmin } from "@/lib/super-admin";
import astrobotLogo from "@/assets/astrobot-logo-light.webp";

export const Route = createFileRoute("/dashboard/login")({
  head: () => ({
    meta: [{ title: "Sign in — Dashboard" }, { name: "robots", content: "noindex" }],
  }),
  component: LoginPage,
});

const ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "cms", label: "CMS" },
  { value: "school", label: "School" },
  { value: "instructor", label: "Instructor" },
];

function roleLabel(r: AppRole) {
  return ROLES.find((x) => x.value === r)?.label ?? r;
}

function LoginPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<AppRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const msg = window.sessionStorage.getItem(ACCESS_MESSAGE_KEY);
      if (msg) {
        setError(msg);
        window.sessionStorage.removeItem(ACCESS_MESSAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !data.user) {
      setBusy(false);
      setError(signInError?.message ?? "Sign in failed.");
      return;
    }

    if (isHardcodedSuperAdmin(data.user.email)) {
      setBusy(false);
      navigate({ to: roleHome(selectedRole) });
      return;
    }

    const wl = await supabase.rpc("check_whitelist", { _email: data.user.email ?? "" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wlRow: any = Array.isArray(wl.data) ? wl.data[0] : null;
    if (!wlRow || !wlRow.approved) {
      await supabase.auth.signOut();
      setBusy(false);
      setError("Your access has been revoked. Contact your administrator.");
      return;
    }

    const { data: allowed, error: verifyErr } = await supabase.rpc("verify_dashboard_access", {
      _selected: selectedRole,
    });

    if (verifyErr) {
      await supabase.auth.signOut();
      setBusy(false);
      setError(toSafeErrorMessage(verifyErr, "Could not verify dashboard access."));
      return;
    }

    if (!allowed) {
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();
      await supabase.auth.signOut();
      setBusy(false);
      if (r?.role) {
        setError(
          `This account doesn't have ${roleLabel(selectedRole)} access. Try signing in as ${roleLabel(
            r.role as AppRole,
          )} instead.`,
        );
      } else {
        setError(
          `This account doesn't have ${roleLabel(selectedRole)} access. Contact your administrator.`,
        );
      }
      return;
    }

    if (selectedRole === "school") {
      const { data: ur } = await supabase
        .from("user_roles")
        .select("school_id")
        .eq("user_id", data.user.id)
        .eq("role", "school")
        .maybeSingle();
      if (ur?.school_id) {
        const { data: sc } = await supabase
          .from("schools")
          .select("is_active")
          .eq("id", ur.school_id)
          .maybeSingle();
        if (!sc || sc.is_active !== true) {
          await supabase.auth.signOut();
          setBusy(false);
          setError("Your school's access is currently inactive. Contact your administrator.");
          return;
        }
      }
    }

    navigate({ to: roleHome(selectedRole) });
  }

  const display = { fontFamily: "'Space Grotesk', 'Sora', system-ui, sans-serif" } as const;
  const body = { fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif" } as const;

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4 sm:p-6"
      style={{
        ...body,
        backgroundColor: "#08081a",
        backgroundImage: [
          "radial-gradient(ellipse 60% 45% at 10% -10%, color-mix(in oklab, var(--gold) 18%, transparent), transparent 60%)",
          "radial-gradient(ellipse 55% 45% at 95% 5%, color-mix(in oklab, var(--cyan) 12%, transparent), transparent 55%)",
          "radial-gradient(ellipse 70% 55% at 50% 115%, color-mix(in oklab, var(--brand-navy) 45%, transparent), transparent 70%)",
        ].join(", "),
        backgroundAttachment: "fixed",
      }}
    >
      <style>{`
        @keyframes radar-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes radar-ping {
          0% { transform: scale(0.4); opacity: 0.7; }
          80% { opacity: 0.05; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .radar-sweep {
          background: conic-gradient(from 0deg, transparent 0deg, rgba(79,70,229,0) 240deg, rgba(79,70,229,0.35) 340deg, rgba(129,140,248,0.75) 358deg, transparent 360deg);
          -webkit-mask-image: radial-gradient(circle at center, black 62%, transparent 63%);
                  mask-image: radial-gradient(circle at center, black 62%, transparent 63%);
          animation: radar-sweep 5s linear infinite;
        }
      `}</style>

      <div className="relative flex h-auto min-h-[640px] w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl lg:h-[720px]">
        {/* Left Panel — Orbital brand */}
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden border-r border-white/10 bg-gradient-to-br from-[#08081a]/80 to-[#10102a]/60 md:flex">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(#4f46e5 0.5px, transparent 0.5px)",
              backgroundSize: "24px 24px",
            }}
          />

          <Link
            to="/"
            aria-label="Back to homepage"
            className="absolute left-10 top-10 flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
          >
            <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#4f46e5]" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
              Station KRC-01
            </span>
          </Link>

          <div className="absolute right-10 top-10 flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 backdrop-blur-md">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-400">
              Link Live
            </span>
          </div>

          <div className="relative flex items-center justify-center">
            {/* Ripple pings (radar echo) */}
            <div
              aria-hidden
              className="absolute h-[200px] w-[200px] rounded-full border border-indigo-400/40"
              style={{ animation: "radar-ping 3.4s cubic-bezier(0,0,0.2,1) infinite" }}
            />
            <div
              aria-hidden
              className="absolute h-[200px] w-[200px] rounded-full border border-indigo-400/40"
              style={{
                animation: "radar-ping 3.4s cubic-bezier(0,0,0.2,1) infinite",
                animationDelay: "1.1s",
              }}
            />
            <div
              aria-hidden
              className="absolute h-[200px] w-[200px] rounded-full border border-indigo-400/40"
              style={{
                animation: "radar-ping 3.4s cubic-bezier(0,0,0.2,1) infinite",
                animationDelay: "2.2s",
              }}
            />

            <div className="absolute h-[400px] w-[400px] rounded-full border border-indigo-500/20" />
            <div className="absolute h-[300px] w-[300px] rounded-full border border-indigo-500/40" />
            <div className="absolute h-[200px] w-[200px] rounded-full border-2 border-indigo-500/60 shadow-[0_0_30px_rgba(79,70,229,0.25)]" />

            {/* Crosshair lines */}
            <div
              aria-hidden
              className="absolute h-[400px] w-px bg-gradient-to-b from-transparent via-indigo-500/25 to-transparent"
            />
            <div
              aria-hidden
              className="absolute h-px w-[400px] bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent"
            />

            {/* Radar sweep */}
            <div aria-hidden className="radar-sweep absolute h-[400px] w-[400px] rounded-full" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <h1
                className="text-4xl font-bold tracking-tighter text-white drop-shadow-[0_2px_12px_rgba(10,10,26,0.9)]"
                style={display}
              >
                ASTROBOT
                <br />
                ACADEMY
              </h1>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.3em] text-indigo-300/70 drop-shadow-[0_1px_6px_rgba(10,10,26,0.9)]">
                Mission Control // v2.0
              </p>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-10 right-10 flex flex-col items-end gap-1 opacity-60">
            <span className="h-px w-16 bg-indigo-500/60" />
            <span className="font-mono text-[9px] tracking-widest text-indigo-300/80">
              LAT 42.3601° N
            </span>
            <span className="font-mono text-[9px] tracking-widest text-indigo-300/80">
              LONG 71.0589° W
            </span>
          </div>

          <div className="absolute bottom-10 left-10 font-mono text-[9px] leading-relaxed text-indigo-500/50">
            USR_LOAD: ACTIVE
            <br />
            SRV_STAT: NOMINAL
            <br />
            CRYPT_LV: RSA_4096
          </div>
        </div>

        {/* Right Panel — Sign-in form (glass) */}
        <div className="relative flex w-full flex-col justify-center border-l border-white/10 bg-white/[0.04] p-8 backdrop-blur-2xl sm:p-12 md:w-[460px] lg:p-16">
          {/* Mobile brand strip */}
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <img
              src={astrobotLogo}
              alt="AstroBot Academy"
              className="h-8 w-auto"
              draggable={false}
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
              Mission Control
            </span>
          </div>

          <div className="mb-8">
            <h2 className="mb-2 text-2xl font-bold text-white" style={display}>
              Dashboard sign in
            </h2>
            <p className="text-sm text-slate-400">Secure access to terminal services.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            {/* Role selector */}
            <div className="space-y-3">
              <label className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">
                Signing in as
              </label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md sm:grid-cols-4">
                {ROLES.map((r) => {
                  const active = selectedRole === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setSelectedRole(r.value)}
                      className={
                        "rounded-lg px-1 py-2 text-[11px] font-bold transition-all " +
                        (active
                          ? "bg-[#4f46e5] text-white shadow-lg"
                          : "text-slate-400 hover:text-white")
                      }
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-600 backdrop-blur-md transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-400">
                  Password
                </label>
                <Link
                  to="/dashboard/forgot-password"
                  className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-500/80 transition-colors hover:text-indigo-400"
                >
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-12 text-sm text-white placeholder:text-slate-600 backdrop-blur-md transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-indigo-400/80 transition-colors hover:text-indigo-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] py-4 text-sm font-bold text-white shadow-[0_0_25px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              style={display}
            >
              {busy ? "SIGNING IN…" : `SIGN IN AS ${roleLabel(selectedRole).toUpperCase()}`}
              {!busy && (
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              )}
            </button>
          </form>

          <div className="mt-12 flex flex-col gap-4 border-t border-[rgba(129,140,248,0.15)] pt-8">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">New to the Academy?</span>
              <Link
                to="/dashboard/signup"
                className="font-bold text-indigo-400 transition-colors hover:text-indigo-300"
              >
                Create account
              </Link>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-white"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Back to Public Site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
