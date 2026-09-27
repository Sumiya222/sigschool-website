# Branching & release workflow

Three tiers, in order: **your feature branch → `develop` → `main`.**
`main` is meant to represent production — the branch that deploys, once a
`deploy` job is wired up again (see below).

## Why this exists

Classic GitHub branch protection (required PRs, required reviews, blocking
direct pushes) needs GitHub Pro on a private repo, which this repo doesn't
have. This workflow gets the same practical safety — nothing untested lands
on the live site — using only branches and CI, which are free.

## The flow

1. **Branch off `develop`**, not `main`:
   ```bash
   git checkout develop
   git pull
   git checkout -b yourname/short-description
   ```
2. Commit and push your branch, open a **PR into `develop`**. CI (typecheck,
   lint, build, the link-target-parity test, gitleaks) runs automatically on
   every PR into `develop`, same as it does for `main`.
3. Once merged, `develop` has your change. This is the shared,
   continuously-CI-checked integration branch — think of it as the
   staging layer. **Nothing deploys when `develop` changes.**
4. When a batch of work on `develop` is actually ready to go live, open a
   PR **from `develop` into `main`**. There's currently no `deploy` job —
   it was removed (see `docs/SETUP.md` §9) since the repo had no working
   deploy secrets and the hosting target isn't finalized. Once a host is
   chosen, re-add a `deploy` job to `.github/workflows/ci.yml` gated on
   `github.ref == 'refs/heads/main'` — merging a develop→main PR is meant
   to be the one action that triggers it, independent of which host is
   behind it.

```
feature/x ──PR──▶ develop ──PR──▶ main ──▶ (deploy job: not yet configured)
feature/y ──PR──▶ develop
```

## What this does and doesn't give you

- **Does**: every change gets CI-checked before merging into either branch;
  `main` only changes deliberately, via an explicit develop→main PR, never
  by accident; the repo's default branch is set to `develop`, so a fresh
  `git clone` and any new PR default there instead of `main`.
- **Doesn't**: this isn't a full staging *environment* — `develop` and
  `main` currently share the same Supabase project and the same `.env`
  values. There's no separate staging database yet. That's a real follow-up
  worth doing before the LMS work starts touching schema, but it's a
  separate decision (a second Supabase project, migration promotion between
  them) from this branch workflow.
- **Doesn't** technically block someone from pushing straight to `main` —
  GitHub Free won't enforce that for a private repo. This is a team
  convention, not a hard gate. Follow it anyway.

## Who merges `develop` → `main`

For now: whoever has been designated to own production merges (the repo
admin). Revisit this once the team has a rhythm going.
