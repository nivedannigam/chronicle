# Chronicle Release Readiness

**Release candidate date:** 2026-08-20  
**Target:** Real family beta  
**Decision:** READY WITH KNOWN MINOR ISSUES

---

## Gate summary

| Gate                       | Status                                                                     |
| -------------------------- | -------------------------------------------------------------------------- |
| P0 open                    | **0**                                                                      |
| Trust/data/privacy P1 open | **2 deferred** (see below)                                                 |
| Production build           | **Pass**                                                                   |
| Typecheck (`tsc -b`)       | **Pass**                                                                   |
| Test suite                 | **863 tests pass** (includes `release-gate.test.ts`)                       |
| Lint                       | Pre-existing issues in `dev-dist/workbox` and finance snapshot unused vars |

---

## P0 = 0

No open P0 issues. Verified by automated release gate tests and full suite.

---

## P1 closed (this release gate)

| ID        | Fix                                                                            |
| --------- | ------------------------------------------------------------------------------ |
| REL-P1-01 | Health home consumer copy — removed "reprocess/processing/extraction" phrasing |
| REL-P1-02 | Profile Security reset dialog — removed "registry/knowledge graph" language    |
| REL-P1-03 | Universal Ask ambiguous balance — asks which account/loan instead of guessing  |
| REL-P1-04 | Platform integrity audit — includes Property module                            |
| REL-P1-05 | Property module enabled in Modules hub — routes to Library property category   |
| REL-P1-06 | Property hub card — status/attention from `buildPropertyKnowledge()`           |

---

## P1 remaining (deferred — documented limitations)

| ID        | Area     | Problem                                                | User impact                                                    | Why deferred                                                                |
| --------- | -------- | ------------------------------------------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
| REL-P1-07 | Property | No dedicated Property home, settings, or detail routes | Journey D lacks module-native linked insurance/loan UI         | Requires new module screens (out of scope for release gate)                 |
| REL-P1-08 | Search   | No Property intelligence search provider               | Property entities rank lower in global Search vs other modules | Library category + Ask cover property records; provider is new surface area |
| REL-P1-09 | Property | Setup uses global Setup, not module-specific settings  | Users connect Home folder via Setup, not Property settings     | No Property settings route exists yet                                       |
| REL-P1-10 | Timeline | No dedicated Property timeline provider                | Property events appear via document-derived timeline only      | Acceptable for beta via Library + life timeline document events             |

These do **not** block a careful family beta when Property expectations are set correctly: **Library + Ask + Modules hub entry**.

---

## P2 deferred backlog

| ID        | Area         | Problem                                                                |
| --------- | ------------ | ---------------------------------------------------------------------- |
| REL-P2-01 | Tasks        | Tasks page uses mock task data (not core beta nav)                     |
| REL-P2-02 | Mail         | Mail module is placeholder                                             |
| REL-P2-03 | Lint         | `dev-dist/workbox` ESLint rule definition errors                       |
| REL-P2-04 | Lint         | Unused vars in finance snapshot service/tests                          |
| REL-P2-05 | Performance  | Modules hub loads multiple knowledge queries on open                   |
| REL-P2-06 | Mobile       | No automated narrow-viewport E2E in CI                                 |
| REL-P2-07 | Design       | Minor card/spacing inconsistencies across modules                      |
| REL-P2-08 | Cross-module | Narrative Ask composes evidence locally; no multi-domain LLM synthesis |

---

## Known limitations (beta expectations)

1. **Property beta path:** Modules → Property card → Library (property category). Ask supports property questions. No Property module home yet.
2. **Travel, Education, Employment:** Coming soon — not in beta scope.
3. **Tasks / Mail:** Not part of core life-records beta.
4. **Live data validation:** Integrity audits available in Advanced/Settings; live counts require connected Drive data.
5. **AI narrative:** Requires configured AI provider; otherwise Ask returns structured evidence-only answers.

---

## Data integrity status

| Audit                               | Available | Automated test |
| ----------------------------------- | --------- | -------------- |
| `runHealthIntegrityAudit()`         | ✅        | ✅             |
| `runFinanceIntegrityAudit()`        | ✅        | ✅             |
| `runPropertyIntegrityAudit()`       | ✅        | ✅             |
| `runModuleDocumentIntegrityAudit()` | ✅        | ✅             |
| `runPlatformIntegrityAudit()`       | ✅        | ✅             |

No mock financial/insurance/vehicle/property values in production Ask or module home paths. Mock providers confined to tests and `AI_PROVIDER=mock` offline mode.

---

## Privacy status

- Identity documents masked in Ask and detail views
- Finance identifiers masked in knowledge and timeline
- Property registration numbers masked
- Separate Ask session keys per family member
- RLS policies on Supabase tables (user ownership)

Manual QA recommended: switch family members on Library, Search, Ask, Timeline.

---

## AI safety status

- Universal Ask is evidence-first; structured path for facts/status/coverage
- Missing evidence returns honest limitations
- Conflicting values surfaced explicitly
- No AI on Home/Library/Search/Timeline load
- Production Ask engine: `aiAskReasoningEngine` (not mock)

---

## Performance status

- No Drive scan on Home load (cached queries)
- Modules hub performs parallel knowledge reads (acceptable)
- No premature optimization applied in release gate

---

## Mobile status

- Bottom nav shell implemented
- Skeletons on Library, Modules, document detail
- Manual narrow-viewport QA recommended before wide beta

---

## Production / DEV separation

DEV-only (gated by `import.meta.env.DEV`):

- `/connectors/debug`
- `/health/knowledge-debug` (redirect in prod)
- `/health/reports/:id/ocr` (redirect in prod)
- `/health/compare` (redirect in prod)

Production redirects legacy module Ask routes to `/ask?context=…`.

---

## Build & test commands

```bash
npx tsc -b
npm run test
npm run build
npm run lint   # pre-existing failures outside app source
```

Release gate tests: `src/__tests__/release-gate.test.ts`

---

## Final beta decision

### **READY WITH KNOWN MINOR ISSUES**

Safe for a **careful family beta** with real documents when:

- Beta scope includes all six record modules via Library + Ask
- Property is explained as **Library-first** until module home ships
- AI provider configured OR users accept structured Ask answers only
- Tester uses Google Drive setup flow before expecting module data

Not yet **READY FOR FAMILY BETA** without caveats because Property lacks module-native home/settings and Property global Search provider.

---

## Consolidated release backlog

| ID        | Area           | Severity | Problem                                  | User impact                    | Root cause              | Fix                    | Status       |
| --------- | -------------- | -------- | ---------------------------------------- | ------------------------------ | ----------------------- | ---------------------- | ------------ |
| REL-P0-   | —              | P0       | None open                                | —                              | —                       | —                      | **Closed**   |
| REL-P1-01 | Health UX      | P1       | Engineering copy on Health home          | Confusing language             | Legacy processing terms | Consumer copy update   | **Fixed**    |
| REL-P1-02 | You/Security   | P1       | Registry/knowledge graph in reset dialog | Breaks trust/language contract | Legacy cleanup wording  | Consumer copy update   | **Fixed**    |
| REL-P1-03 | Ask            | P1       | Ambiguous balance could guess            | Wrong financial answer         | Missing disambiguation  | Clarification prompt   | **Fixed**    |
| REL-P1-04 | Platform audit | P1       | Property missing from audit              | Incomplete ops visibility      | Phase 1 gap             | Added property module  | **Fixed**    |
| REL-P1-05 | Modules        | P1       | Property coming soon                     | Cannot reach property records  | Intentional deferral    | Enable + Library route | **Fixed**    |
| REL-P1-06 | Modules        | P1       | No Property hub card                     | Module invisible               | Missing hub builder     | `buildPropertyHubCard` | **Fixed**    |
| REL-P1-07 | Property       | P1       | No Property module home                  | Incomplete Journey D           | Foundation-only phase   | Module UI phase        | **Deferred** |
| REL-P1-08 | Search         | P1       | No Property search provider              | Weak cross-surface find        | Not registered          | Provider phase         | **Deferred** |
| REL-P1-09 | Setup          | P1       | No Property settings                     | Setup confusion                | No route                | Settings phase         | **Deferred** |
| REL-P1-10 | Timeline       | P1       | No Property timeline provider            | Fewer property events          | Document-only events    | Provider phase         | **Deferred** |
| REL-P2-01 | Tasks          | P2       | Mock task data                           | Non-core surface               | Placeholder module      | Future                 | Deferred     |
| REL-P2-02 | Mail           | P2       | Placeholder module                       | Non-core surface               | Not built               | Future                 | Deferred     |
| REL-P2-03 | Lint           | P2       | workbox lint noise                       | CI noise                       | Generated asset         | Ignore/generated fix   | Deferred     |
| REL-P2-04 | Lint           | P2       | Finance unused vars                      | CI noise                       | WIP snapshot code       | Cleanup                | Deferred     |
