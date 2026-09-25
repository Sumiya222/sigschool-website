import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { useRequireAnyRole } from "@/lib/dashboard-auth";
import { DashboardLoading } from "@/components/dashboard/DashboardShell";

export const Route = createFileRoute("/dashboard/account")({
  head: () => ({
    meta: [{ title: "Account — Dashboard" }, { name: "robots", content: "noindex" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const state = useRequireAnyRole();
  const [fullName, setFullName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const userId = state.status === "ready" ? state.session.userId : "";
  const email = state.status === "ready" ? state.session.email : "";

  useEffect(() => {
    if (state.status !== "ready") return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", state.session.userId)
        .maybeSingle();
      setFullName((p?.full_name as string | null) ?? "");
      setLoadingProfile(false);
    })();
  }, [state]);

  if (state.status !== "ready") return <DashboardLoading />;
  const loading = loadingProfile;

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setNameErr(null);
    setNameMsg(null);
    setSavingName(true);
    const value = fullName.trim();
    const { error } = await supabase
      .from("profiles")
      .upsert({ user_id: userId, full_name: value || null }, { onConflict: "user_id" });
    setSavingName(false);
    if (error) setNameErr(toSafeErrorMessage(error, "Could not save your name."));
    else setNameMsg("Name saved.");
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    if (password.length < 8) {
      setPwErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setPwErr("The two passwords don't match.");
      return;
    }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSavingPw(false);
    if (error) {
      setPwErr(error.message);
      return;
    }
    setPassword("");
    setConfirm("");
    setPwMsg("Password updated. Use it next time you sign in.");
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Signed in as <span className="text-slate-200">{email}</span>. Update how your name appears
          across the dashboard, or change your password.
        </p>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-500">
          Loading…
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Display name</h2>
            <form onSubmit={saveName} className="space-y-3">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                maxLength={120}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              />
              {nameErr && (
                <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                  {nameErr}
                </div>
              )}
              {nameMsg && (
                <div className="rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
                  {nameMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={savingName}
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                {savingName ? "Saving…" : "Save name"}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Change password</h2>
            <form onSubmit={savePassword} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  New password
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                  Confirm new password
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                />
              </div>
              {pwErr && (
                <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                  {pwErr}
                </div>
              )}
              {pwMsg && (
                <div className="rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300">
                  {pwMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={savingPw}
                className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                {savingPw ? "Saving…" : "Change password"}
              </button>
            </form>
            <p className="mt-3 text-xs text-slate-500">
              Locked out? You can also reset via email from the{" "}
              <Link to="/dashboard/forgot-password" className="text-indigo-300 hover:underline">
                forgot password
              </Link>{" "}
              screen.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
