# CI and the quality ratchet

## Why this exists

Two facts about this repo, both verified on 2026-09-23:

1. **Every push to `main` deploys to production.** The Vercel GitHub integration builds
   each `main` commit at `target: production`. The live host is `ceo.aryx.pro`.
2. **`vite build` does not typecheck.** `"build": "vite build"` compiles and bundles; it
   never runs `tsc`. On 2026-09-23 the build was green while `tsc --noEmit` reported
   **337 errors across 48 files**.

Together those meant a commit could add type errors, go green, and deploy to production
with a checkmark. There was no `.github` directory at all — zero CI, at any point.

There is also no staging environment. Preview deployments carry Vercel SSO protection
and have no preview-target environment variables, so they boot to "Configuration
Required". There is nowhere to test but production.

## What runs

`.github/workflows/ci.yml`, on every push to `main` and every pull request:

| Step | Blocking | State today |
|---|---|---|
| `npx vitest run` | yes | 19 files, 92 tests, green |
| `npx vite build` | yes | green, ~3s |
| `node scripts/quality-ratchet.mjs` | yes | at baseline |

## The ratchet

A blocking `tsc` would be correct and would also fail every commit from day one — 337
errors is not a thing you fix before your next push. So the gate is a ratchet instead:
**the counts may never rise.**

`quality-baseline.json` holds the ceiling:

```json
{ "typeErrors": 337, "errors": 19, "warnings": 22 }
```

- A count goes **up** → CI fails. Your change introduced it; fix it.
- A count goes **down** → CI passes and tells you to lock it in:
  ```
  npm run ratchet:update
  ```
  Commit the lowered baseline alongside the fix. `--update` refuses to raise a number.

This gates regressions from the first commit while letting the existing debt be paid
down incrementally. The 337 errors are concentrated — 198 of them (59%) live in seven
routed pages: `RoadVisualizerWithFilters` (46), `Roadmap` (36), `Deployments` (34),
`Projects` (28), `TechStack` (19), `Assignments` (19), `SaaSSpend` (16).

### Local

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # eslint .
npm run ratchet        # both, compared against the baseline
npm run ratchet:update # lower the baseline after a fix
```

## Making it actually block

**The workflow reports; it does not block until the checks are required on `main`.**
Branch protection is off on this repo. To turn it on:

```bash
gh api -X PUT repos/mpbhealth/aryx-ceo/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  -f 'required_status_checks[strict]=true' \
  -f 'required_status_checks[contexts][]=tests · build · ratchet' \
  -F 'enforce_admins=false' \
  -F 'required_pull_request_reviews=null' \
  -F 'restrictions=null'
```

Verify:

```bash
gh api repos/mpbhealth/aryx-ceo/branches/main/protection | jq '.required_status_checks.contexts'
```

Before this returns the check name, a red CI run does not stop a production deploy.

## When the type count reaches zero

Make the build tell the truth permanently:

```json
"build": "tsc -b && vite build"
```

Do not do this before the count is 0 — it would block every deploy, including
rollbacks and hotfixes.
