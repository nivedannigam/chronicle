# Chronicle — Family Beta Friction Log

**Date:** 2026-08-20  
**Method:** Consumer-product validation pass (Release Gate complete)  
**Validator:** Agent dogfooding + UI path review + automated trust tests  
**Constraint:** Product UI only — no dev tools, debug panels, or raw DB queries

---

## Validation scope note

Live end-to-end dogfooding against real Google Drive / Supabase data **requires an authenticated family session**. Unauthenticated navigation redirects to `/login`. Findings below combine:

1. **Blocked live UI paths** (documented as validation gaps)
2. **Consumer UI code-path review** (navigation, copy, empty states, filters)
3. **Automated trust/evidence tests** (Ask, property, identity, finance, release gate)
4. **Prior release gate backlog** (`docs/RELEASE_READINESS.md`)

Family members should re-run sections 2–16 while signed in to confirm real-data accuracy (2026 health, XEV 9e, Pune home, Advika passport, finance balances).

---

## Friction entries

| ID          | Screen                     | Action                                                        | Expected                                                                               | Actual                                                                                                            | Severity | Status               |
| ----------- | -------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- | -------------------- |
| BETA-VAL-01 | All                        | Open app signed out                                           | Land on Home after auth                                                                | Redirect to `/login` — live dogfooding blocked without Google sign-in                                             | —        | Validation gap       |
| BETA-P1-01  | Library                    | Filter by Identity, Finance, or Property; trigger empty state | Empty copy names the module (e.g. "No identity documents…")                            | Copy said "No **library** documents…" because `resolveActiveFilterLabel` only mapped 3 modules                    | P1       | **Fixed**            |
| BETA-P1-02  | Ask                        | Open `/ask` with no conversation                              | Starter chips reflect universal scope (health, insurance, identity, finance, property) | Headline was universal but chips were health-only (`ASK_EMPTY_SUGGESTIONS`)                                       | P1       | **Fixed**            |
| BETA-P1-03  | Modules → Property         | Tap Property card expecting a module home                     | Clear property hub with facts, linked insurance/loans                                  | Routes to Library property category only; no `/property` home or settings                                         | P1       | Deferred (REL-P1-07) |
| BETA-P1-04  | Search                     | Search "Pune home" or property entity                         | Property records rank in global Search                                                 | No Property intelligence search provider; Library + Ask only                                                      | P1       | Deferred (REL-P1-08) |
| BETA-P1-05  | Modules → Property (setup) | Connect Home folder from Property context                     | Property-specific setup screen                                                         | Uses global Setup (`ROUTES.setup`)                                                                                | P1       | Deferred (REL-P1-09) |
| BETA-P2-01  | Search (empty)             | Browse categories on Search home                              | All major life domains browsable                                                       | Browse chips: Health, Insurance, Documents, People only — no Vehicles, Finance, Property, Identity                | P2       | Open                 |
| BETA-P2-02  | Timeline                   | Filter by Property events                                     | Property chip alongside other modules                                                  | Module filter chips omit Property                                                                                 | P2       | Open                 |
| BETA-P2-03  | Home                       | Read Life Score hero within 10s                               | Immediate answer to "what's happening?"                                                | Life Score dimensions are useful but abstract; headline alternates with attention count — slightly cognitive load | P2       | Open                 |
| BETA-P2-04  | Modules hub                | Open Modules                                                  | Fast, calm hub                                                                         | Parallel knowledge queries on open (REL-P2-05) — acceptable but noticeable on slow networks                       | P2       | Open                 |
| BETA-P2-05  | Ask                        | First visit without AI provider                               | Structured evidence answers                                                            | Evidence-only mode is honest but less conversational — expected                                                   | P2       | Open                 |
| BETA-P2-06  | Library                    | Find document source for a fact                               | One tap to source + module                                                             | Works via document detail; module chips on cards — generally good; Property lacks module-native deep links        | P2       | Open                 |
| BETA-P2-07  | Mobile                     | Use Timeline filters at ~390px width                          | No horizontal confusion                                                                | Module/importance chips use horizontal scroll — usable but easy to miss off-screen filters                        | P2       | Open                 |
| BETA-P2-08  | Tasks / Mail               | Discover via nav                                              | Hidden or clearly "later"                                                              | Placeholder modules — not in core beta nav (REL-P2-01/02)                                                         | P2       | Open                 |

---

## P0 issues

**None confirmed in this pass.**

No trust/data/privacy failures were found in automated tests or UI-path review. **Live P0 verification** (wrong owner, stale 2026 health dates, finance double-count, family leakage) requires signed-in family session — flagged as mandatory manual QA before wider beta.

---

## P1 issues

| ID         | Summary                                                          | Fix                                                               |
| ---------- | ---------------------------------------------------------------- | ----------------------------------------------------------------- |
| BETA-P1-01 | Library empty-state mislabeled Identity/Finance/Property filters | Fixed — `resolveActiveFilterLabel` uses `getLifeModuleById()`     |
| BETA-P1-02 | Universal Ask empty chips were health-only                       | Fixed — `UNIVERSAL_ASK_EMPTY_SUGGESTIONS` on `/ask`               |
| BETA-P1-03 | No Property module home/settings/detail                          | Deferred — document beta path: Modules → Library (property) + Ask |
| BETA-P1-04 | No Property global Search provider                               | Deferred — use Library category search + Ask                      |
| BETA-P1-05 | Property setup via global Setup only                             | Deferred — acceptable for beta with onboarding copy               |

---

## P2 backlog

See table above (BETA-P2-01 through BETA-P2-08) plus `docs/RELEASE_READINESS.md` REL-P2-* items.

---

## Fixes implemented (this pass)

1. **`src/ui/figma/screens/FigmaDocumentsLibraryScreen.tsx`** — module filter labels for all life modules
2. **`src/features/ask/constants/ask-empty-state.ts`** — added `UNIVERSAL_ASK_EMPTY_SUGGESTIONS`
3. **`src/ui/figma/ask/AskPremiumEmptyState.tsx`** — universal `/ask` uses cross-module starter prompts

**Tests:** Ask suite + `release-gate.test.ts` — 77 tests pass (spot run).

---

## Re-test after fixes

| Journey                                 | Result                                                  |
| --------------------------------------- | ------------------------------------------------------- |
| Library → filter Property → empty state | Label now "property" not "library" (code verified)      |
| `/ask` empty state                      | Universal headline + cross-module chips (code verified) |
| Live Home → Modules → Health → Ask      | **Requires signed-in session**                          |

---

## Trust spot-check (automated / fixture-backed)

| Fact                    | Source path                                  | Ask alignment                                       | Owner                     |
| ----------------------- | -------------------------------------------- | --------------------------------------------------- | ------------------------- |
| Pune home purchase date | Property knowledge + evidence resolver tests | Ask answers "When did I buy my Pune home?" in tests | Account owner             |
| Passport expiry         | Identity evidence resolver                   | Masked identifier only in answer                    | Per-member scope in tests |
| Home loan balance       | Finance evidence                             | Conflicting balances surfaced, not guessed          | Finance module            |
| Insurance completeness  | Universal Ask turn builder                   | Honest "don't have enough information" when partial | Cross-module              |
| Life Timeline filtering | `filterLifeTimelineEvents`                   | Upload/import events excluded from Life Timeline    | Release gate test         |

**Manual contradiction check still required** for 10 live facts once authenticated.

---

## Final decision input

See companion summary in agent report (sections 12–22).  
**Recommendation:** **YES — WITH FIXES** for careful family beta on 5 full modules + Property via Library/Ask, after signed-in real-data smoke test.
