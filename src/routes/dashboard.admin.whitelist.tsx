import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fromCaught, toSafeErrorMessage } from "@/lib/db-error-message";
import { Badge, statusTone, statusLabel } from "@/components/dashboard/Badge";
import {
  adminSetWhitelistStatus,
  adminDeleteWhitelistEntry,
} from "@/lib/admin-revocation.functions";

export const Route = createFileRoute("/dashboard/admin/whitelist")({
  component: WhitelistPage,
});

type Role = "admin" | "cms" | "school" | "instructor";
type Status = "pending" | "approved" | "revoked";

interface WhitelistRow {
  id: string;
  email: string;
  role: Role;
  status: Status;
  assigned_school_id: string | null;
  created_at: string;
  is_super_admin: boolean;
}
interface School {
  id: string;
  name: string;
}

function WhitelistPage() {
  const setWhitelistStatus = useServerFn(adminSetWhitelistStatus);
  const deleteWhitelistEntry = useServerFn(adminDeleteWhitelistEntry);
  const [rows, setRows] = useState<WhitelistRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isSuper, setIsSuper] = useState(false);

  // form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("instructor");
  const [schoolId, setSchoolId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const [{ data: wl, error: e1 }, { data: sc, error: e2 }, { data: superFlag }] =
      await Promise.all([
        supabase.from("whitelist").select("*").order("created_at", { ascending: false }),
        supabase.from("schools").select("id, name").order("name"),
        supabase.rpc("is_current_user_super_admin"),
      ]);
    if (e1) setErr(toSafeErrorMessage(e1, "Could not load the whitelist."));
    setRows((wl as WhitelistRow[]) ?? []);
    setSchools((sc as School[]) ?? []);
    setIsSuper(Boolean(superFlag));
    if (e2 && !e1) setErr(toSafeErrorMessage(e2, "Could not load schools."));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  // If a non-super admin somehow has role=admin selected, snap back.
  useEffect(() => {
    if (!isSuper && (role === "admin" || role === "cms")) setRole("instructor");
  }, [isSuper, role]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setFormErr(null);
    setSubmitting(true);
    const { data: sessionRes } = await supabase.auth.getSession();
    const { error } = await supabase.from("whitelist").insert({
      email: email.trim().toLowerCase(),
      role,
      status: "approved" as const,
      created_by: sessionRes.session?.user.id ?? null,
      assigned_school_id:
        (role === "school" || role === "instructor") && schoolId ? schoolId : null,
    });
    setSubmitting(false);
    if (error) {
      setFormErr(
        error.code === "23505"
          ? "That email is already whitelisted with this role for this school."
          : toSafeErrorMessage(error, "Could not add that whitelist entry."),
      );
      return;
    }
    setEmail("");
    setRole(isSuper ? "instructor" : "instructor");
    setSchoolId("");
    refresh();
  }

  async function onRevoke(id: string) {
    try {
      await setWhitelistStatus({ data: { id, status: "revoked" } });
      refresh();
    } catch (e) {
      alert(toSafeErrorMessage(fromCaught(e), "Could not revoke that entry."));
    }
  }

  async function onApprove(id: string) {
    try {
      await setWhitelistStatus({ data: { id, status: "approved" } });
      refresh();
    } catch (e) {
      alert(toSafeErrorMessage(fromCaught(e), "Could not approve that entry."));
    }
  }

  async function onDelete(id: string) {
    if (
      !confirm(
        "Delete this whitelist entry? The user's session will be invalidated immediately and they won't be able to sign in again with this email.",
      )
    )
      return;
    try {
      await deleteWhitelistEntry({ data: { id } });
      refresh();
    } catch (e) {
      alert(toSafeErrorMessage(fromCaught(e), "Could not delete that entry."));
    }
  }

  const schoolNameById = Object.fromEntries(schools.map((s) => [s.id, s.name]));

  // Pagination — 15 per page
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [rows, currentPage],
  );
  const rangeStart = rows.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, rows.length);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Whitelist</h1>
        <p className="mt-1 text-sm text-slate-400">
          Only whitelisted, approved emails can create dashboard accounts.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Add a new whitelisted email</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            type="email"
            required
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          >
            {isSuper && <option value="admin">Admin</option>}
            {isSuper && <option value="cms">CMS</option>}
            <option value="school">School</option>
            <option value="instructor">Instructor</option>
          </select>
          <select
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            disabled={role === "admin" || role === "cms"}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-40"
          >
            <option value="">
              {role === "admin" || role === "cms" ? "N/A" : "— select school —"}
            </option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </form>
        {!isSuper && (
          <div className="mt-3 text-xs text-slate-500">
            Only Super Admin can add new Admin or CMS accounts.
          </div>
        )}
        {formErr && (
          <div className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {formErr}
          </div>
        )}
        {schools.length === 0 && (
          <div className="mt-3 text-xs text-slate-500">
            No schools yet. Add a school before whitelisting School / Instructor users.
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-200">Current entries</h2>
          <button
            onClick={refresh}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
          >
            Refresh
          </button>
        </div>
        {err && (
          <div className="border-b border-red-900/60 bg-red-950/40 px-6 py-2 text-sm text-red-300">
            {err}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="hidden md:table-cell px-6 py-3">School</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No whitelist entries yet.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => {
                  const isAdminRow = r.role === "admin" || r.role === "cms";
                  const canMutateAdmin = isSuper; // regular admin can't touch admin/CMS rows
                  const locked = r.is_super_admin; // super admin row is fully locked in UI
                  const canRevoke = !locked && (!isAdminRow || canMutateAdmin);
                  const canApprove = canRevoke;
                  const canDelete = canRevoke;
                  return (
                    <tr key={r.id} className="text-slate-200">
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="break-all">{r.email}</span>
                          {r.is_super_admin && <Badge tone="super">Super Admin</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-3 capitalize">{r.role === "cms" ? "CMS" : r.role}</td>
                      <td className="hidden md:table-cell px-6 py-3 text-slate-400">
                        {r.assigned_school_id ? (schoolNameById[r.assigned_school_id] ?? "—") : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {locked ? (
                          <span className="text-xs text-slate-500 italic">Locked</span>
                        ) : isAdminRow && !canMutateAdmin ? (
                          <span className="text-xs text-slate-500 italic">Super Admin only</span>
                        ) : (
                          <div className="inline-flex gap-2">
                            {r.status !== "approved" && canApprove && (
                              <button
                                onClick={() => onApprove(r.id)}
                                className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                              >
                                Approve
                              </button>
                            )}
                            {r.status !== "revoked" && canRevoke && (
                              <button
                                onClick={() => onRevoke(r.id)}
                                className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/10"
                              >
                                Revoke
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => onDelete(r.id)}
                                className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-3 text-xs text-slate-400">
            <div>
              Showing <span className="text-slate-200">{rangeStart}</span>–
              <span className="text-slate-200">{rangeEnd}</span> of{" "}
              <span className="text-slate-200">{rows.length}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-1">
                Page <span className="text-slate-200">{currentPage}</span> of{" "}
                <span className="text-slate-200">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
