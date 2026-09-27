# Architecture & current state

Read this before you touch `schools`, `invoices`, `camp_window`,
`registrations`, or the role model. This doc exists because the codebase
looks further along than it is: the public site was just rebranded to a
placeholder K-12 identity ("Northbridge Preparatory School"), but the
**database still models the previous business** — a STEM/robotics vendor
that sold a subject into other schools' buildings, billed per institution.
Building new features (especially LMS features) directly on top of that
model will produce something that has to be ripped out again. This doc says
what's solid, what isn't, and what the recommended fix looks like — but
deliberately stops short of writing the migration, because the LMS itself
needs schema changes in the same area (a guardian/parent entity, a real
student/parent login) and the two should be designed together, not in two
uncoordinated passes.

---

## Stack

- **Framework**: TanStack Start + React 19 + TypeScript, file-based routing
  via TanStack Router (`src/routes/`).
- **Backend**: Supabase — Postgres with Row Level Security, Auth, Storage.
  Migrations live in `supabase/migrations/`, timestamp-ordered; later files
  `ALTER` earlier tables, so the *final* shape of a table is whatever the
  last migration touching it left behind — always grep across the whole
  directory, never trust a single `CREATE TABLE`.
- **Styling**: Tailwind v4, tokens defined in `src/styles.css`.
- **CI** (`.github/workflows/ci.yml`): typecheck, lint, production build,
  a link-target-scheme parity test (`tests/link-target-parity.test.mjs`,
  keeps a TS allowlist and a Postgres allowlist in sync), and a gitleaks
  secret scan. All green as of this writing — keep it that way.

## Conventions to follow

**CMS-fallback pattern.** Every public page reads content through
`useSection("section_key")` / `str(c, "field_key", "fallback")` /
`list<T>(c, "field_key", FALLBACK_ARRAY)` from `src/lib/site-content.ts`.
The fallback is what renders when the CMS field is empty — it's not dead
code, it's the guarantee that the page never renders broken/blank. New
sections should follow this same pattern rather than hardcoding copy with
no CMS path. The one place this pattern was *missing* (`Nav.tsx` had no
fallback link list, so an empty `nav_items` table meant an empty navbar) has
already been fixed — treat that as the standard to hold every new component
to, not an exception.

**Brand identity**: `src/lib/brand.ts` is the single source of truth for
the school's name/tagline/contact info/domain. Never hardcode the school
name or contact details again — import `BRAND` from there. The color/font
tokens live in `src/styles.css`.

**Auth & roles, as they exist today**: `app_role` enum = `admin | school |
instructor | cms`. Access is whitelist-gated (`public.whitelist` table) —
sign-up is closed; only a Super Admin can approve an Admin or CMS account
(`docs/SETUP.md` §3). `has_role()` and `current_user_school_id()`
(`supabase/migrations/20260724050517_*.sql`, hardened in
`20260724175709_*.sql`) are the RLS building blocks almost every policy is
built from. There's a hardcoded Super Admin escape hatch
(`src/lib/super-admin.ts`, `HARDCODED_SUPER_ADMIN_EMAIL`) that bypasses
`user_roles` entirely — this is intentional bootstrap behavior, not a bug.

## What's already solid — build on these

- **CI**, as above.
- **The gradebook core**: `terms`, `sections`, `class_sessions`,
  `attendance`, `marks`, `remarks`, `result_cards` (a view), and
  `instructor_assignments` are generic and section/term-scoped, not
  tangled up in the tenant-billing concept below. This is a legitimate
  starting point for LMS gradebook/attendance features.
- **The payment ledger mechanics**: `payments` table, `record_payment()`
  RPC, the `recompute_invoice_paid()` trigger, and the paid/partial/overdue
  status derivation are reusable regardless of *what* an invoice bills —
  only the billing subject (see below) needs to change.
- **`dashboard.school.index.tsx` / `dashboard.school.summary.tsx`** are
  already written as `schoolId ? filtered : unfiltered` — they'd survive a
  single-school collapse with minor cleanup, not a rewrite.

## The known gap: this app still thinks it's a multi-school vendor

Confirmed directly against the migrations (not assumed):

- **`schools`** (`supabase/migrations/20260724050517_*.sql`, extended in
  `20260724101951_*.sql`) has `monthly_rate_per_student` and
  `project_start_date` — a *billed client institution*, not "our own
  campus." `sections.school_id`, `students` (indirectly, via
  `section_id → sections.school_id`), `invoices.school_id`, and the
  `'school'` app_role are all wired to this same table meaning "one of
  several institutions we bill."
- **`invoices` + `generate_invoice()`** (final version in
  `supabase/migrations/20260830000000_invoice_arrears.sql`) bill a
  `school_id` for `active_student_count × rate_per_student` for a month —
  i.e. "how many active students does this client school have this month."
  There is no notion of billing one family for one student's tuition.
- **`current_user_school_id()`** (`20260724175709_*.sql`) is hardcoded to
  `role = 'school'` — it returns `NULL` for every other role. Any new RLS
  policy that assumes this returns "my school" for an admin/instructor user
  will silently get `NULL` and needs its own helper.
- **`camp_window`** (`supabase/migrations/20260726154749_*.sql`) is a
  singleton table (`UNIQUE(singleton) + CHECK(singleton = true)` — the same
  pattern as `company_settings`) modeling one open/closed seasonal event
  with a hard `capacity` and waitlist. `CampAnnouncementBar` and
  `CampRegistrationProvider`/`RegistrationModal`
  (`src/components/camp/`) are built entirely around "there is exactly one
  campaign, open or closed, with a seat ceiling" — not year-round rolling
  admissions.
- **`registrations`** (camp signups, `20260727122741_*.sql`) has **no FK**
  to `students`, `schools`, or `camp_window` — the link to a specific camp
  is a free-text `camp_name` column matched by convention, nothing else.
  It's already a fully decoupled subsystem. Its parent/guardian columns
  (`parent_name`, `parent_email`, `parent_phone`) are structured columns,
  not a jsonb blob — a good shape to reuse for a real guardian entity.
- **There is no guardian/parent entity anywhere.** No table, no FK from
  `students`. A parent's name is currently smuggled into `students.notes`
  in practice (the admin student export literally labels that column
  "Notes (Father's Name)") — that is not a data model, it's a workaround.
- **There is no student- or parent-facing login of any kind.** Every
  `dashboard.*` role is staff-only, and `dashboard.signup.tsx` hard-blocks
  anyone not already whitelist-approved. A parent/student portal is
  greenfield work, not a hidden feature waiting to be exposed.
- **`sections.grade`** was already widened to `CHECK (grade BETWEEN 1 AND
  12)` in `supabase/migrations/20260724091023_*.sql` — this part turned out
  to already be fine. It just doesn't allow `0` for Kindergarten yet.

**Code that assumes the old model and would need rework:**
`dashboard.admin.schools.*` (multi-tenant CRUD — rate/address/activate-
deactivate for *multiple* institutions, most of which becomes meaningless
once there's one school), `src/lib/invoice-pdf.ts` (its `InvoicePdfData`
shape bills a school, not a guardian), `dashboard.admin.invoices.*` and
`dashboard.school.invoices.tsx` (same assumption, plus the "generate
invoice" form is built around picking a school and a headcount).

**Code that's already generic despite the misleading name:**
`src/lib/school-context.ts` and `src/lib/school-export.ts` are just
session-context and CSV/XLSX/PDF-export plumbing — neither actually
encodes tenancy logic, despite living under "school"-flavored filenames.

## Recommended direction (not yet implemented — confirm with the team first)

1. **Keep the `schools` table, its columns, and `school_id` FKs
   structurally as-is.** Reframe it as "campuses" in naming/docs only —
   this also means it's already shaped to support more than one real
   campus later, for free. Drop `monthly_rate_per_student` and
   `project_start_date` — billing moves off this table entirely.
2. **Add a `guardians` table + `student_guardians` join table**
   (relationship label, primary-contact/billing-contact flags), modeled on
   `registrations`'s existing `parent_name`/`parent_email`/`parent_phone`
   shape. This is the prerequisite for both per-family billing and any
   future parent portal — do this once, not twice.
3. **Repoint invoicing at students**: add a `tuition_rates` table
   (by grade / effective year), rewrite `generate_invoice()` to bill one
   student's tuition for the month (with an optional per-student override)
   instead of a school's active headcount. Rework `invoice-pdf.ts` to bill
   a guardian, not a school, and update the three invoice
   routes/components listed above.
4. **Stop granting the `'school'` app_role going forward.** Postgres can't
   cheaply drop an enum value, so leave it defined, but migrate existing
   `'school'`-role whitelist entries to `'admin'` and don't hand it out to
   new users.
5. **Replace the `camp_window`-gated banner/modal with an always-available
   admissions application.** `/admissions` already exists as a real page
   (not a redirect) as of the rebrand — rolling admission, no hard
   capacity/waitlist ceiling. `registrations` likely doesn't need to be
   rebuilt, just reframed as "enrollment applications" — its schema is
   already decoupled and has the right shape.
6. **Design this alongside the LMS data model, not before it in
   isolation.** The guardian entity and parent-facing auth in particular
   are shared infrastructure that both this fix and the LMS's parent/
   student portal need — settle both shapes in one pass.

### Open questions for the team (deliberately left open here)

- Bill per-student or per-family (a family with 3 kids — one invoice or
  three)?
- Does "campus" ever actually need to be plural for this school, or is a
  single-row `schools` table permanently fine?
- What's the LMS's first slice of scope — gradebook/assignment extension,
  or the parent/student portal first? (They share the guardian/auth work,
  but one has to go first.)
- Do dormant `'school'`-role whitelist entries get migrated to `admin` or
  just left inactive?

## What NOT to do

- Don't add new features on top of `school_id`-as-billed-tenant,
  `camp_window`-as-admissions, or today's 4-role model assuming any of them
  is final — they're slated for replacement per above.
- Don't hardcode brand/contact strings — use `src/lib/brand.ts`.
- Don't add a CMS-driven section without a code fallback (see the
  CMS-fallback pattern above) — an empty CMS table should degrade
  gracefully, never render blank.

## Also pending (unrelated to the above, low-risk, ready when you are)

`supabase/migrations/20260925190000_rebrand_northbridge_prep.sql` is a
drafted-but-unapplied migration that reseeds CMS content (site settings,
page sections, leadership bios, nav items, the camp window's own text)
from the old "AstroBot Academy" brand to the new placeholder brand. Review
and apply it via your normal Supabase migration flow whenever convenient —
it's independent of everything above.
