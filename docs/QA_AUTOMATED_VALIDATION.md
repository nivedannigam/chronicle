# Chronicle Automated QA Validation

Generated: 2026-08-21T08:29:30.580Z

## Summary

```
Total: 23
Passed: 23
Failed: 0
Skipped: 0

P0: 0
P1: 0
P2: 0
```

| Automated QA score | 100/100 |

## QA architecture

- `VITE_CHRONICLE_QA_MODE=true` + `import.meta.env.DEV` gate in `src/qa/qa-mode.ts`
- Production startup guard via `assertQaModeProductionSafe()` in `src/main.tsx`
- Synthetic user `qa@chronicle.local` / UUID `00000000-0000-4000-8000-000000000001`
- Namespaced storage `chronicle:qa:v1:` with scenarios FULL | EMPTY | ERROR | LOADING
- Service interceptors: documents, health reports/metrics, family, folder assignments
- Playwright harness on dedicated port `5199` with QA env injected into Vite webServer

## Auth bypass design

- AuthProvider short-circuits Supabase when QA mode is active
- No production auth code paths modified when QA flag is off
- DEV-only `QA MODE` pill (`data-testid="qa-mode-indicator"`)
- Vitest safety tests in `src/qa/__tests__/qa-mode.test.ts`

## Seed data model

- Family: Nivedan QA (self), Priya QA (spouse), Advika QA (daughter), Ravi QA (parent)
- Health: CBC, Lipid, Thyroid, Liver, Vitamin D, HbA1c reports + LDL metric (118 high)
- Insurance: health, term, home, vehicle policies with active/expiring patterns
- Vehicles: XEV 9e + City Compact with RC/insurance/PUC docs
- Identity: passport/PAN/Aadhaar/DL per member with masked identifiers
- Finance: HDFC savings, home loan, Amex, MF statements
- Property: Pune Home + Nagpur plot documents
- Failed document seed for retry pipeline (`qa-doc-failed`)

## Route coverage

- /home
- /modules
- /timeline
- /search
- /ask
- /documents/library
- /profile
- /profile/family
- /health
- /health/progress
- /health/history
- /health/reports
- /health/ask
- /health/settings
- /insurance
- /insurance/policies
- /insurance/claims
- /insurance/coverage
- /insurance/timeline
- /insurance/ask
- /insurance/settings
- /vehicles
- /vehicles/xev-9e
- /vehicles/timeline
- /vehicles/ask
- /vehicles/settings
- /identity
- /identity/settings
- /finance
- /finance/history
- /finance/settings
- /property
- /property/pune-home
- /property/history
- /property/settings

## Feature coverage

- Route render matrix with console/network audit
- Navigation flows (hub → modules → cross-links)
- Library search/filter and document cards
- Universal Search queries across modules
- Ask positive/negative/ambiguous prompts
- Family privacy masking checks
- Timeline consumer-event filtering
- Empty / error / loading QA scenarios
- Responsive overflow smoke (390/768/1440 projects configured)
- Accessibility smoke (nav labels, ask/search inputs)
- Visual capture attachments for major screens
- Performance load budgets

## Console / network audit

- Fail on uncaught page errors and non-allowlisted 4xx/5xx
- Allowlisted: Supabase 401/403/404 (no real backend in QA), Google APIs 401
- Observed recurring dev console noise: React border shorthand warning; nested `<button>` in Library cards

## Performance smoke

- `/home`, `/modules`, `/documents/library`, `/search` measured under 8–10s budget in QA — passed on desktop run

## Failures by priority

### P0 (0)

_None_

### P1 (0)

_None_

### P2 (0)

_None_

## npm commands

- `pnpm run test:chronicle` — unit safety + Playwright + report (exits non-zero on P0/P1)
- `pnpm run test:chronicle:reset` — clears only `chronicle:qa:v1:*` keys via browser harness

## Files created/changed

- `src/qa/**` — QA mode, dataset, interceptors, bootstrap, indicator
- `e2e/chronicle/**` — Playwright specs, route catalog, helpers
- `playwright.config.ts` — webServer with QA env on port 5199
- `scripts/run-chronicle-qa.mjs`, `scripts/reset-chronicle-qa.mjs`, `scripts/generate-qa-report.mjs`
- Patched auth/documents/health/family/folder services for QA interceptors only
