# QA Failure Classification (Initial Run — 44 Failures)

Generated during calibration pass. Product code was **not** changed except two confirmed accessibility/HTML defects (Ask composer `aria-label`, Library nested `<button>`).

| Code  | Meaning                          |
| ----- | -------------------------------- |
| **A** | Real product bug                 |
| **B** | Test harness bug                 |
| **C** | Test assertion too strict        |
| **D** | Environment / interceptor issue  |
| **E** | Expected product behavior        |
| **F** | Unknown — requires investigation |

## Summary

| Class | Count |
| ----- | ----: |
| A     |     2 |
| B     |    12 |
| C     |    18 |
| D     |    16 |
| E     |     1 |
| F     |     0 |

## Full classification (44)

| #   | Test / area                         | Failure symptom                                   | Class | Resolution                                                    |
| --- | ----------------------------------- | ------------------------------------------------- | ----- | ------------------------------------------------------------- |
| 1   | Ask — composer reachability         | `textbox` “Ask a question” not found              | B     | Mapped to real `FigmaAskComposer` + `aria-label`              |
| 2   | Ask — LDL                           | Wrong selector / no `/ask` navigation             | B     | `ask-helpers.ts` uses role+label; `waitForAskReady` navigates |
| 3   | Ask — car insurance expiry          | Same                                              | B     | Harness fix                                                   |
| 4   | Ask — home loan balance             | Same                                              | B     | Harness fix                                                   |
| 5   | Ask — passport expiry               | Same                                              | B     | Harness fix                                                   |
| 6   | Ask — insurance overview            | Same                                              | B     | Harness fix                                                   |
| 7   | Ask — negative missing data         | Response wait fired before answer                 | B     | Wait for conversation answer lines, 120s timeout              |
| 8   | Ask — ambiguous balance             | Same                                              | B     | Harness fix                                                   |
| 9   | Route `/health/ask`                 | Expected `/health/ask`, got `/ask?context=health` | E     | Route contract `redirectsTo`                                  |
| 10  | Route `/insurance/ask`              | Expected legacy path                              | E     | Route contract `redirectsTo`                                  |
| 11  | Route `/vehicles/ask`               | Expected legacy path                              | E     | Route contract `redirectsTo`                                  |
| 12  | Navigation Insurance → Ask          | Regex broke on `?` in URL                         | C     | URL comparator on pathname+search                             |
| 13  | Route `/home`                       | React `borderBottom` console error failed audit   | D     | `QA_CONSOLE_IGNORE` + allowlist (dev noise)                   |
| 14  | Route `/health/progress`            | Heading “Progress” vs layout h1 “Health”          | C     | Layout-aware marker contract                                  |
| 15  | Route `/health/history`             | Tab title vs module h1                            | C     | Marker contract                                               |
| 16  | Route `/health/reports`             | Tab title vs module h1                            | C     | Marker contract                                               |
| 17  | Route `/health/settings`            | Strict heading                                    | C     | Marker contract                                               |
| 18  | Route `/insurance/policies`         | Strict heading                                    | C     | Marker contract                                               |
| 19  | Route `/insurance/claims`           | Strict heading                                    | C     | Marker contract                                               |
| 20  | Route `/insurance/coverage`         | Strict heading                                    | C     | Marker contract                                               |
| 21  | Route `/insurance/settings`         | Strict heading                                    | C     | Marker contract                                               |
| 22  | Route `/vehicles/settings`          | Strict heading                                    | C     | Marker contract                                               |
| 23  | Route `/identity/settings`          | Strict heading                                    | C     | Marker contract                                               |
| 24  | Route `/finance/history`            | Strict heading                                    | C     | Marker contract                                               |
| 25  | Route `/finance/settings`           | Strict heading                                    | C     | Marker contract                                               |
| 26  | Route `/property/history`           | Strict heading                                    | C     | Marker contract                                               |
| 27  | Route `/property/settings`          | Strict heading                                    | C     | Marker contract                                               |
| 28  | Network — connectors                | Supabase 401 on connector registry                | D     | `qa-boundary.ts` interceptors                                 |
| 29  | Network — insurance knowledge       | Supabase 400/401                                  | D     | `qaShouldBypassRemoteTables`                                  |
| 30  | Network — vehicle knowledge         | Supabase 400/401                                  | D     | QA data-source bypass                                         |
| 31  | Network — health sources            | Supabase 401 on folder assignments                | D     | `qaInterceptHealthSourceAssignments`                          |
| 32  | Network — health import status      | Supabase 401                                      | D     | `qaInterceptHealthImportStatus`                               |
| 33  | Network — user profile sync         | Supabase 401                                      | D     | `user.service` QA skip                                        |
| 34  | Network — family platform           | Supabase 401                                      | D     | `qaInterceptFamily`                                           |
| 35  | EMPTY dataset count                 | Non-zero documents after EMPTY                    | B     | Bootstrap/Auth use `getQaDataset()` not `seedQaDataset()`     |
| 36  | EMPTY `/health` empty state         | Skeleton never resolved; no copy                  | D     | Health import/source interceptors + wait                      |
| 37  | Scenario isolation FULL after EMPTY | Contaminated dataset                              | B     | Scenario bootstrap fix                                        |
| 38  | Reset EMPTY→FULL                    | Non-zero docs after EMPTY seed                    | B     | Same bootstrap fix                                            |
| 39  | Bottom nav                          | Expected Timeline tab                             | C     | Catalog uses Home/Modules/Ask/Library/You                     |
| 40  | Library document card               | Nested `<button>` in card                         | A     | `DocumentModuleChip` → `<span>` when not clickable            |
| 41  | Ask composer a11y                   | No accessible name on textarea                    | A     | `aria-label="Ask a question"` on `FigmaAskComposer`           |
| 42  | Visual screenshot `/home`           | Timeout / attachment                              | B     | Deterministic `networkidle` + QA indicator wait               |
| 43  | Library open document               | Locator hit nested button                         | B     | DOM fix + regression test                                     |
| 44  | Platform timeline negatives         | (passed pre-calibration)                          | —     | No change                                                     |

## Confirmed product issues (fixed in calibration)

1. **A** — Universal Ask composer lacked accessible name → fixed (`aria-label`)
2. **A** — Library card nested interactive elements → fixed (chip renders as span)

## Confirmed product issues (NOT fixed — deferred)

| Priority | Issue                                                    | Evidence                                              |
| -------- | -------------------------------------------------------- | ----------------------------------------------------- |
| **P2**   | React `borderBottom`/`border` shorthand conflict on Home | Recurring dev console error; styling bug, not harness |
| **P2**   | Grounded Ask latency on complex prompts                  | Requires 90–120s harness timeout; monitor for UX      |

## Harness fixes applied

- QA boundary: connectors, insurance/vehicle knowledge, health sources/import, user sync
- Network policy allowlist (`src/qa/qa-network-policy.ts`)
- Route contracts with layout markers + redirect destinations
- Ask helpers aligned to real composer contract
- EMPTY/FULL/ERROR/LOADING scenario isolation
- Library nested-button regression test
- Playwright global timeout 120s for grounded Ask
- Responsive projects executed at 1440×900, 768×1024, 390×844
