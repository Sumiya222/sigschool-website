import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { type ComponentType, type ReactNode } from "react";
import { LogOut, ExternalLink, UserCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import astrobotLogo from "@/assets/astrobot-logo-light.webp";

interface NavItem {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Unread/unopened count shown as a small pill next to the label. Omit or 0 to hide. */
  badge?: number;
}

function NavBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[color:var(--bp-indigo)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#0b0b1e]">
      {count > 99 ? "99+" : count}
    </span>
  );
}

interface DashboardShellProps {
  title: string;
  email: string;
  fullName?: string | null;
  roleLabel: string;
  nav: NavItem[];
  /** Routes that open in a focused editor: the console rail collapses by default. */
  focusRoutes?: string[];
  children: ReactNode;
}

function greetingPrefix(): string {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function displayFrom(email: string, fullName?: string | null): string {
  const n = (fullName ?? "").trim();
  if (n) return n;
  return email.split("@")[0] ?? email;
}

export function DashboardShell({
  title,
  email,
  fullName,
  roleLabel,
  nav,
  focusRoutes = [],
  children,
}: DashboardShellProps) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const inFocusRoute = focusRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"));
  // In a focus route the console menu is hidden entirely; the page provides
  // its own "Back to console" link.
  const hideRail = inFocusRoute;

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/dashboard/login" });
  }

  const name = displayFrom(email, fullName);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <a
              href="/"
              aria-label="Back to AstroBot Academy homepage"
              className="flex items-center"
            >
              <img
                src={astrobotLogo}
                alt="AstroBot Academy"
                className="h-9 w-auto sm:h-10"
                draggable={false}
              />
            </a>
            <span
              className="hidden rounded-full border border-[color:var(--bp-indigo)]/50 bg-[color:var(--bp-indigo)]/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--bp-indigo)] sm:inline-flex"
              aria-label={`${roleLabel} dashboard`}
            >
              {roleLabel} Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right md:block">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
                {greetingPrefix()}
              </div>
              <div className="max-w-[240px] truncate text-xs font-semibold text-[color:var(--bp-ink)]">
                {name}
              </div>
            </div>
            <Link
              to="/dashboard/account"
              className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-3 py-1.5 text-xs font-medium text-[color:var(--bp-ink)] transition hover:border-[color:var(--bp-indigo)]"
              title="Account settings"
            >
              <UserCircle2 className="size-3.5" aria-hidden />
              Account
            </Link>
            <a
              href="/"
              className="hidden items-center gap-1.5 rounded-full border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] px-3 py-1.5 text-xs font-medium text-[color:var(--bp-ink)] transition hover:border-[color:var(--bp-indigo)] sm:inline-flex"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Public site
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--bp-indigo)] px-3 py-1.5 text-xs font-semibold text-[#0b0b1e] transition hover:brightness-110"
            >
              <LogOut className="size-3.5" aria-hidden />
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className={"grid flex-1 grid-cols-1 " + (hideRail ? "" : "md:grid-cols-[240px_1fr]")}>
        {!hideRail && (
          <aside className="hidden flex-col border-r border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)]/50 px-4 py-6 md:flex">
            <div className="mb-4 flex items-center justify-between px-2">
              <div className="min-w-0">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--bp-muted)]">
                  Section
                </div>
                <div className="mt-1 font-display text-sm font-semibold text-[color:var(--bp-ink)]">
                  {title}
                </div>
                <div
                  className="mt-2 truncate font-mono text-[10px] text-[color:var(--bp-muted)]"
                  title={email}
                >
                  {email}
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1">
              {nav.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      "flex items-center rounded-md border px-3 py-2 text-sm transition " +
                      (active
                        ? "border-[color:var(--bp-indigo)]/60 bg-[color:var(--bp-indigo)]/15 font-semibold text-[color:var(--bp-indigo)]"
                        : "border-transparent text-[color:var(--bp-ink-2)] hover:border-[color:var(--bp-line-strong)] hover:bg-[color:var(--bp-paper-2)] hover:text-[color:var(--bp-ink)]")
                    }
                  >
                    <span className="flex w-full items-center gap-2">
                      {Icon && <Icon className="size-4 opacity-80" />}
                      {item.label}
                      <NavBadge count={item.badge ?? 0} />
                    </span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 border-t border-[color:var(--bp-line)] pt-4 font-mono text-[10px] uppercase tracking-widest text-[color:var(--bp-muted)]">
              AstroBot Mission Control
            </div>
          </aside>
        )}

        {!hideRail && (
          <nav className="flex gap-1 overflow-x-auto border-b border-[color:var(--bp-line)] bg-[color:var(--bp-paper-2)]/60 px-3 py-2 md:hidden">
            {nav.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition " +
                    (active
                      ? "border-[color:var(--bp-indigo)]/60 bg-[color:var(--bp-indigo)]/15 font-semibold text-[color:var(--bp-indigo)]"
                      : "border-[color:var(--bp-line-strong)] text-[color:var(--bp-ink-2)]")
                  }
                >
                  <span className="inline-flex items-center gap-1.5">
                    {item.label}
                    <NavBadge count={item.badge ?? 0} />
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        <main className="min-w-0 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
        <span className="inline-block size-2 animate-pulse rounded-full bg-[color:var(--bp-indigo)]" />
        Loading mission data…
      </div>
    </div>
  );
}
