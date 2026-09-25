import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, ToastProvider, cx } from "@/components/dashboard/ui";
import { supabase } from "@/integrations/supabase/client";
import { InquiriesPanel } from "@/components/dashboard/site/InquiriesPanel";
import { ApplicationsPanel } from "@/components/dashboard/site/ApplicationsPanel";
import { SheetSyncPanel } from "@/components/dashboard/site/SheetSyncPanel";
import { RegistrationsPanel } from "@/components/dashboard/site/RegistrationsPanel";

export const Route = createFileRoute("/dashboard/admin/submissions")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab:
      search.tab === "applications"
        ? "applications"
        : search.tab === "registrations"
          ? "registrations"
          : search.tab === "archive"
            ? "archive"
            : "inquiries",
  }),
  component: SubmissionsPage,
});

const TABS = [
  {
    id: "inquiries" as const,
    label: "Inquiries",
    description: "Messages sent through the Contact page.",
  },
  {
    id: "applications" as const,
    label: "Job Applications",
    description: "People who applied through the Careers page.",
  },
  {
    id: "registrations" as const,
    label: "Camp Registrations",
    description: "Children registered for camps through the website.",
  },
  {
    id: "archive" as const,
    label: "Sheet Archive",
    description: "Permanent Google Sheet record of every submission.",
  },
];

function SubmissionsPage() {
  return (
    <ToastProvider>
      <Body />
    </ToastProvider>
  );
}

function useUnopenedCountsByTab(): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [inquiries, applications, registrations] = await Promise.all([
        supabase.from("inquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        // Registrations track "opened" separately from status — status is a real
        // confirmed/waitlisted/cancelled decision, not a read flag.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("registrations" as any) as any)
          .select("id", { count: "exact", head: true })
          .is("opened_at", null),
      ]);
      if (cancelled) return;
      setCounts({
        inquiries: inquiries.count ?? 0,
        applications: applications.count ?? 0,
        registrations: registrations.count ?? 0,
      });
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return counts;
}

function Body() {
  const { tab } = useSearch({ from: "/dashboard/admin/submissions" });
  const navigate = useNavigate({ from: "/dashboard/admin/submissions" });
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const unopenedByTab = useUnopenedCountsByTab();

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Form submissions"
        title={active.label}
        description={active.description}
      />

      <div
        role="tablist"
        aria-label="Form submissions"
        className="flex flex-wrap gap-1 rounded-xl border border-[color:var(--bp-line-strong)] bg-[color:var(--bp-paper-2)] p-1"
      >
        {TABS.map((t) => {
          const count = unopenedByTab[t.id] ?? 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === active.id}
              onClick={() => navigate({ search: { tab: t.id } })}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition",
                t.id === active.id
                  ? "bg-[color:var(--bp-indigo)]/15 font-semibold text-[color:var(--bp-indigo)]"
                  : "text-[color:var(--bp-ink-2)] hover:text-[color:var(--bp-ink)]",
              )}
            >
              {t.label}
              {count > 0 && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[color:var(--bp-indigo)] px-1.5 py-0.5 text-[10px] font-bold leading-none text-[#0b0b1e]">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {active.id === "inquiries" ? (
        <InquiriesPanel />
      ) : active.id === "applications" ? (
        <ApplicationsPanel />
      ) : active.id === "registrations" ? (
        <RegistrationsPanel />
      ) : (
        <SheetSyncPanel />
      )}
    </div>
  );
}
