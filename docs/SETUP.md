# Setup & Migration Runbook

Everything needed to stand this project up on a **new backend** (fresh Lovable
Cloud / Supabase project) with the Super Admin in place and the Google Sheets
archive working. Follow the steps in order — later steps assume the earlier
ones ran.

---

## 0. What you need before you start

| Thing | Why |
| --- | --- |
| The repository | Contains all migrations under `supabase/migrations/` |
| A new Lovable Cloud (Supabase) project | Database, auth, storage |
| The owner's **Google account email** | Becomes the Super Admin |
| A Google account that will own the archive Sheet | Form submissions mirror |

---

## 1. Database schema

Apply **every** file in `supabase/migrations/` in filename order. They are
timestamp-prefixed, so alphabetical order is the correct order.

- In Lovable: the migrations run automatically when the project is remixed or
  connected to a new backend.
- Locally / self-hosted: `supabase db push` (or run each file in the SQL editor
  top to bottom).

Do not skip or reorder files. Several later migrations alter tables and RLS
policies created by earlier ones.

**Sanity check after applying:**

```sql
select count(*) from information_schema.tables where table_schema = 'public';
select unnest(enum_range(null::public.app_role));  -- admin, instructor, school, cms
```

`app_role` **must** include `cms`. If it doesn't, migrations are incomplete.

---

## 2. Storage buckets

Two **private** buckets are required. Neither may ever be made public.

| Bucket | Contents | Public? |
| --- | --- | --- |
| `site-media` | CMS images used across the public site | **No** |
| `applications` | Candidate CVs from `/careers` | **No** |

CVs are served only through short-lived signed URLs generated for authenticated
admins. Making `applications` public would expose every applicant's CV.

---

## 3. Super Admin — do this before anyone signs in

Sign-up is whitelist-gated and **only the Super Admin can whitelist Admin or CMS
accounts**. On a fresh database the whitelist is empty, so nobody can log in
until this runs.

1. Open `supabase/bootstrap/01_super_admin.sql`.
2. Change `v_email` to the owner's Google account email.
3. Run the whole file in the SQL editor.
4. Confirm the final `SELECT` returns exactly one row with
   `is_super_admin = true` and `status = approved`.
5. Have that person sign in with Google once. Their `user_roles` row is created
   automatically on first sign-in.

Also update the client-side fallback so the app agrees with the database:

- Set the env var `VITE_SUPER_ADMIN_EMAIL` to the same address, **or**
- Edit the default in `src/lib/super-admin.ts`.

The two must match. The database is the real security boundary; the client
constant only controls which dashboards the UI offers.

### Role model (for reference)

| Role | Can access |
| --- | --- |
| **Super Admin** (`admin` + `is_super_admin`) | Everything — school operations *and* CMS |
| **Admin** | School operations + Form Submissions. **No CMS.** |
| **CMS** | Website content only. No students, no submissions, no audit log. |
| **Instructor** | Assigned sections only |
| **School** | Own school only |

Only the Super Admin can create Admin or CMS whitelist entries — this is
enforced by the `enforce_super_admin_rules` trigger, not just the UI.

---

## 4. Google auth

Enable the Google sign-in provider on the new backend. Managed credentials are
fine; no configuration is needed beyond enabling it. Email/password sign-up
stays closed — access is by whitelist only.

---

## 5. Google Sheets archive

Every contact inquiry and job application is mirrored to a Google Sheet as a
permanent, append-only record. The database stays the primary store.

### 5a. Tabs the sync writes to

| Tab | Source | Columns |
| --- | --- | --- |
| `Parent Inquiries` | `/contact`, Parent track | Timestamp, Name, Email, Phone, Message, Submission ID |
| `School Inquiries` | `/contact`, School track | Timestamp, Name, Email, Phone, School Name, Role, Message, Submission ID |
| `Other Inquiries` | `/contact`, Other track | Timestamp, Name, Email, Phone, Message, Submission ID |
| `Job Applications` | `/careers` | Timestamp, Full Name, Email, Phone, Position, LinkedIn/Portfolio, Cover Note, CV Filename, Submission ID |

Tabs are created automatically on first write, with a bold frozen header row.
You do not need to create them by hand — an empty Sheet is enough.

**CV files are never written to the Sheet — only the filename.** CVs stay in the
private `applications` bucket.

### 5b. Google service account (current setup)

A service account survives password changes and staff departures. Auth is
handled entirely by `src/lib/google-service-account.server.ts`, which signs a
JWT with the private key and exchanges it for an access token directly with
Google — no third-party connector in the loop.

1. Google Cloud Console → create a project (or reuse one).
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **IAM & Admin → Service Accounts** → create one → **Keys → Add key → JSON**.
4. Create the Sheet, then **Share** it with the service account's
   `...@...iam.gserviceaccount.com` address, with **Editor** access.
5. Store as secrets:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the `client_email` from the JSON
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — the `private_key` from the JSON,
     newlines included (wrap in double quotes in `.env`)
   - `GOOGLE_SHEETS_ID` — the Sheet ID, the segment between `/d/` and `/edit`
     in its URL

   Some hosts' env-var UIs (e.g. cPanel's Node App panel) mangle multi-line
   values pasted into a single-line field, and the key ends up unparsable
   even after unescaping. If that happens, base64-encode the entire
   `private_key` value (including the `-----BEGIN/END PRIVATE KEY-----`
   lines) and store the base64 string as `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   instead — the app detects and decodes it automatically. See the deploy
   steps below for the exact command.

### 5d. Required secrets summary

| Secret | Required |
| --- | --- |
| `GOOGLE_SHEETS_ID` | ✅ |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | ✅ |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | ✅ |

Never commit any of these. Never put them in client code. If a private key is
ever pasted somewhere outside `.env` (chat, a ticket, a doc), treat it as
compromised and rotate it — delete the key in **IAM & Admin → Service
Accounts → Keys** and add a new one.

### 5e. Rules the sync obeys — do not "fix" these

- **Append-only.** Deleting a submission in the dashboard leaves its Sheet row.
  The Sheet is the master archive; this is deliberate.
- **Status never syncs.** New → Handled lives in the dashboard only.
- **A Sheet failure never fails a form.** The database write happens first; the
  Sheet write is best-effort and queued in `sheet_sync_queue` for retry. The
  visitor always sees success.
- **Submission ID** on every row links back to the database record.

### 5f. Privacy

The Sheet holds names, phone numbers and email addresses. Share it only with
specific named Google accounts. **Never** set it to "anyone with the link".

---

## 6. Verification checklist

Run through this on the new environment before handing it over.

- [ ] `app_role` enum contains `cms`
- [ ] `site-media` and `applications` buckets exist and are **private**
- [ ] Exactly one whitelist row has `is_super_admin = true`
- [ ] Super Admin can sign in and reaches both `/dashboard/admin` and `/dashboard/cms`
- [ ] A regular Admin **cannot** reach `/dashboard/cms`
- [ ] A CMS user **cannot** see Inquiries, Job Applications, students or the audit log
- [ ] Submit a test inquiry on each of the three contact tracks → each appears in its own tab
- [ ] Submit a test job application → appears in `Job Applications`, CV filename only
- [ ] Download that CV from the dashboard → works
- [ ] Delete a submission in the dashboard → the Sheet row remains
- [ ] Change a submission's status → the Sheet is unchanged
- [ ] Temporarily clear `GOOGLE_SHEETS_ID` → a form submission still succeeds and
      queues in the CMS/Admin **Sheet Archive** panel with an error logged

Delete any test rows from the Sheet by hand afterwards — the sync will never
remove them for you.

---

## 7. Things that will break the install

| Symptom | Cause |
| --- | --- |
| Nobody can sign in | Step 3 was skipped — whitelist is empty |
| "Only the Super Admin can add Admin or CMS entries" | Signed-in user isn't the Super Admin; re-run step 3 |
| CMS tab missing for the owner | `VITE_SUPER_ADMIN_EMAIL` doesn't match the whitelist email |
| Forms work but the Sheet stays empty | `GOOGLE_SHEETS_ID` missing, or the Sheet isn't shared with the service account |
| `Unable to parse range: ...%3A...` | A range was URL-encoded; ranges go into the path unencoded |
| Permission error reading a new table | A migration created a table without `GRANT` statements |

---

## 8. Before going live

Placeholder content (faculty figures, testimonials, etc.) means the site
currently ships `noindex, nofollow` site-wide. This is required, not
optional, before the real public launch:

- [ ] Flip `SITE_INDEXABLE` to `true` in `src/lib/site-config.ts` — that's
      the only place it's set; nothing else needs to change. Dashboard
      routes stay `noindex` regardless (hardcoded separately in
      `src/routes/dashboard.tsx`, intentionally — Mission Control should
      never be indexed).
- [ ] Have `/privacy` reviewed by a lawyer and replace its interim content
      (or at least remove the interim-policy notice once it's been
      reviewed) — see `src/routes/privacy.tsx`.

---

## 9. Deploying to HostersPK

Target: cPanel + Passenger shared hosting, Node 22. Deploy is automatic —
`.github/workflows/ci.yml`'s `deploy` job pushes over SSH on every push to
`main`, gated on `quality` + `gitleaks` both passing. Follow this sequence
in order; several steps depend on the one before it existing.

1. **SSH key.** Generate a dedicated deploy keypair (no passphrase — CI
   can't type one). Authorize the public key in cPanel → SSH Access →
   Manage SSH Keys → Import + Authorize.
2. **GitHub Actions secrets** (Settings → Secrets and variables → Actions):
   `HOSTERSPK_SSH_KEY`, `HOSTERSPK_SSH_HOST`, `HOSTERSPK_SSH_PORT`,
   `HOSTERSPK_SSH_USER`, `HOSTERSPK_DEPLOY_PATH`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`. Names must match `ci.yml`'s `deploy`
   job exactly — an unset/mistyped secret resolves to an empty string,
   not an error, so a typo fails silently downstream instead of loudly
   at the source.
3. **Cloudflare in front of the origin**: add the site, cut over
   nameservers at the registrar, create a **proxied** `A` record at the
   origin IP, SSL/TLS mode **Full (strict)** (requires the origin to
   already serve a CA-trusted cert — confirm cPanel AutoSSL has already
   issued one for the domain before switching to strict).
4. **cPanel → Setup Node.js App**: Node 22.x, application root =
   `HOSTERSPK_DEPLOY_PATH`, URL = the live domain, **startup file =
   `.output/server/hosterspk-entry.mjs`** (not `.output/server/index.mjs`
   — see `scripts/hosterspk-entry.mjs` for why). This step is what
   creates the application-root directory on disk — it must exist before
   step 6's first rsync.
5. **Environment variables** (cPanel Node App → Environment Variables, not
   a `.env` file — the app reads `process.env` directly):
   - **`HOST=127.0.0.1` — required.** If unset, Node binds all
     interfaces instead of just localhost, making the app directly
     reachable from the internet, bypassing the Apache/LiteSpeed reverse
     proxy and the IP-forwarding header it would otherwise set for rate
     limiting. `scripts/hosterspk-entry.mjs` logs loudly at boot if this
     is missing.
   - `NODE_OPTIONS=--max-old-space-size=768`
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
     `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `RESEND_API_KEY`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - `NOTIFY_EMAIL_TO`
   - `DIGEST_CRON_SECRET` (must match the value already in Supabase Vault)
   - Optional (code has a fallback): `NOTIFY_EMAIL_FROM`,
     `VITE_SUPER_ADMIN_EMAIL`
6. **First deploy**: push to `main`, watch the `deploy` job in Actions.
7. **Verify**: boot log shows a `Listening on http://127.0.0.1:<port>/`
   line and no `[STARTUP CHECK FAILED]` warning; the live domain loads
   through Cloudflare; `CF-Connecting-IP` is actually arriving (submit a
   public form from two different networks, confirm independent rate
   limits — not a shared bucket).
8. **Origin lock — only after step 7 passes**, or you lock yourself out
   mid-migration. Restrict the origin to Cloudflare's published IP ranges
   via an `.htaccess` `Require ip` allowlist (realistic on shared cPanel
   hosting; Authenticated Origin Pulls needs Apache SSL-vhost config
   shared hosts usually don't expose). Verify: raw origin IP → `403`,
   real domain through Cloudflare → `200`. Until this is done, rate
   limiting is bypassable by anyone who finds the origin IP.
