import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import {
  Button,
  EmptyState,
  ErrorNote,
  Field,
  Panel,
  TextArea,
  TextInput,
  Toggle,
  useToast,
} from "@/components/dashboard/ui";
import { pageLabel } from "@/lib/cms-schema";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  order: number;
}

/** Shown when a page in the menu has not been created in the CMS yet. */
export function PagesOverview({ missingSlug }: { missingSlug: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  async function create() {
    setBusy(true);
    setErr(null);
    const { count } = await supabase.from("pages").select("id", { count: "exact", head: true });
    const { error } = await supabase.from("pages").insert({
      slug: missingSlug,
      title: pageLabel(missingSlug),
      published: false,
      order: (count ?? 0) + 1,
    });
    setBusy(false);
    if (error) return setErr(toSafeErrorMessage(error, "Could not create that page."));
    setCreated(true);
    toast(`${pageLabel(missingSlug)} page created as a draft.`);
  }

  if (created) return <PageSettingsPanel slug={missingSlug} />;

  return (
    <div className="space-y-6">
      {err && <ErrorNote>{err}</ErrorNote>}
      <Panel>
        <EmptyState
          title={`The ${pageLabel(missingSlug)} page hasn't been set up yet`}
          description="Create it as a draft, then add sections and publish it when the wording is ready."
          action={
            <Button variant="primary" disabled={busy} onClick={create}>
              {busy ? "Creating…" : `Create the ${pageLabel(missingSlug)} page`}
            </Button>
          }
        />
      </Panel>
    </div>
  );
}

/** Title, search-listing wording and published state for one page. */
export function PageSettingsPanel({ slug }: { slug: string }) {
  const toast = useToast();
  const [row, setRow] = useState<PageRow | null>(null);
  const [draft, setDraft] = useState<{ title: string; seoTitle: string; seoDescription: string }>({
    title: "",
    seoTitle: "",
    seoDescription: "",
  });
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("pages")
      .select("id, slug, title, seo_title, seo_description, published, order")
      .eq("slug", slug)
      .maybeSingle();
    const r = (data as PageRow | null) ?? null;
    setRow(r);
    if (r) {
      setDraft({
        title: r.title ?? "",
        seoTitle: r.seo_title ?? "",
        seoDescription: r.seo_description ?? "",
      });
    }
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!row) return null;

  const dirty =
    draft.title !== (row.title ?? "") ||
    draft.seoTitle !== (row.seo_title ?? "") ||
    draft.seoDescription !== (row.seo_description ?? "");

  async function save() {
    if (!row) return;
    setSaving(true);
    const { error } = await verifyRowsAffected(
      supabase
        .from("pages")
        .update({
          title: draft.title,
          seo_title: draft.seoTitle || null,
          seo_description: draft.seoDescription || null,
        })
        .eq("id", row.id),
    );
    setSaving(false);
    if (error) return toast(toSafeErrorMessage(error, "Could not save those settings."), "error");
    toast("Page settings saved.");
    refresh();
  }

  return (
    <Panel
      title="Page settings"
      hint="How this page is named and how it appears in search results."
      actions={
        <Button variant="primary" size="sm" disabled={!dirty || saving} onClick={save}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Page name" help="Used in menus and in this control panel.">
          <TextInput
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field
          label="Search result title"
          help="The blue headline shown in Google. Keep it under about 60 characters."
        >
          <TextInput
            value={draft.seoTitle}
            onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })}
          />
        </Field>
        <div className="md:col-span-2">
          <Field
            label="Search result description"
            help="The grey summary underneath the headline in Google. Keep it under about 155 characters."
          >
            <TextArea
              value={draft.seoDescription}
              onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })}
            />
          </Field>
        </div>
        <div className="md:col-span-2 border-t border-[color:var(--bp-line)] pt-4">
          <Toggle
            checked={row.published}
            onChange={() => {}}
            disabled
            label="Live on the website"
            help="Disabled — no page currently checks this flag, so visitors can reach a page regardless of this setting."
          />
        </div>
      </div>
    </Panel>
  );
}
