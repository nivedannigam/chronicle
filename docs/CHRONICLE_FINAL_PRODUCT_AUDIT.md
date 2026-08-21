# Chronicle Final Product, UX & AI Architecture Audit

**Audit date:** 2026-08-21  
**Auditor method:** Read-only codebase trace, Playwright catalog review, `real-data-validation.mjs` output  
**Constraint:** No fixes implemented. Findings reflect actual state, not aspirational state.

---

## Part 2 — Screen-by-Screen UX Audit

**Method:** Component/layout code review + QA screenshot spec paths. **NOT** full manual UX walkthrough of every state on real data.

Scoring: Visual quality / UX clarity / Consistency / Information density (each /10).

| Screen             | Route                 | VQ  | UX  | Con | ID  | Notes                                                                  |
| ------------------ | --------------------- | --- | --- | --- | --- | ---------------------------------------------------------------------- |
| Home               | `/home`               | 7   | 7   | 7   | 6   | Activity cards dense; module status useful but inconsistent vocabulary |
| Modules hub        | `/modules`            | 7   | 8   | 8   | 6   | Clear grid; coming-soon cards without routes                           |
| Ask                | `/ask`                | 7   | 7   | 7   | 6   | Single surface good; evidence panel inconsistent by domain             |
| Search             | `/search`             | 6   | 7   | 6   | 7   | Vehicles missing domain styling; good empty state                      |
| Timeline (life)    | `/timeline`           | 6   | 6   | 5   | 7   | Federated but sparse on real data for non-health modules               |
| Library hub        | `/documents/library`  | 7   | 6   | 6   | 7   | Module sections + catch-all risk; purpose unclear to users             |
| Documents index    | `/documents`          | 6   | 6   | 6   | 6   | Tab label mismatch vs layout                                           |
| Profile            | `/profile`            | 7   | 7   | 7   | 6   | Clean; advanced exposes dev artifacts                                  |
| Health home        | `/health`             | 8   | 8   | 8   | 7   | Reference UX; companion cards well structured                          |
| Health progress    | `/health/progress`    | 7   | 7   | 8   | 7   | Good charts; loading states present                                    |
| Health history     | `/health/history`     | 7   | 8   | 8   | 7   | Canonical timeline for health                                          |
| Health reports     | `/health/reports`     | 7   | 7   | 8   | 7   | List density OK                                                        |
| Health settings    | `/health/settings`    | 8   | 8   | 9   | 6   | Best-in-class module settings pattern                                  |
| Insurance home     | `/insurance`          | 7   | 7   | 7   | 6   | Coverage summary useful                                                |
| Insurance coverage | `/insurance/coverage` | 7   | 7   | 7   | 6   | Category cards                                                         |
| Insurance policies | `/insurance/policies` | 7   | 8   | 7   | 7   | Real policies render                                                   |
| Insurance claims   | `/insurance/claims`   | 6   | 6   | 7   | 5   | Often empty — acceptable                                               |
| Insurance timeline | `/insurance/timeline` | 6   | 6   | 5   | 6   | **Duplicate** of life timeline concept                                 |
| Insurance settings | `/insurance/settings` | 7   | 8   | 8   | 6   | Matches contract                                                       |
| Vehicles home      | `/vehicles`           | 6   | 5   | 6   | 5   | Setup/empty dominates on real data                                     |
| Vehicles timeline  | `/vehicles/timeline`  | 6   | 5   | 5   | 5   | QA synthetic only                                                      |
| Vehicles settings  | `/vehicles/settings`  | 7   | 7   | 8   | 6   | Good copy after polish                                                 |
| Vehicle detail     | `/vehicles/:slug`     | 6   | 6   | 6   | 6   | QA fixture only                                                        |
| Identity home      | `/identity`           | 6   | 6   | 6   | 5   | Empty on real data                                                     |
| Identity settings  | `/identity/settings`  | 6   | 7   | 7   | 5   | Follows contract                                                       |
| Finance home       | `/finance`            | 6   | 6   | 6   | 5   | Empty on real data                                                     |
| Finance history    | `/finance/history`    | 6   | 6   | 5   | 6   | Not in module tabs                                                     |
| Finance settings   | `/finance/settings`   | 6   | 7   | 7   | 5   | Follows contract                                                       |
| Property home      | `/property`           | 6   | 6   | 6   | 5   | Empty on real data                                                     |
| Property history   | `/property/history`   | 6   | 6   | 6   | 5   | Heuristic-only content                                                 |
| Property settings  | `/property/settings`  | 6   | 7   | 7   | 5   | Follows contract                                                       |
| Property detail    | `/property/:slug`     | 6   | 6   | 6   | 5   | QA fixture only                                                        |
| Personal           | `/personal`           | 5   | 5   | 4   | 5   | No layout tabs; feels orphaned                                         |
| Mail               | `/mail`               | 4   | 3   | 3   | 4   | Orphan placeholder                                                     |
| Tasks              | `/tasks`              | 4   | 3   | 3   | 4   | Orphan placeholder                                                     |

**Screens with ONLY render validation:** Most detail routes, profile sub-routes, mail/tasks, finance/property/identity history events, health visit/report/metric detail.

**Visually weak / cluttered:** Mail, Tasks, Personal module, Library when module + catch-all sections overlap, Insurance timeline alongside global timeline.

---

## Part 3 — Cross-Module Consistency vs Universal Module UX Contract

Contract: `src/features/modules/contracts/module-ux.contract.ts`

| Surface                     | Health            | Insurance             | Vehicles             | Identity | Finance            | Property            | Verdict                         |
| --------------------------- | ----------------- | --------------------- | -------------------- | -------- | ------------------ | ------------------- | ------------------------------- |
| Home                        | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD                            |
| Settings                    | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD                            |
| Back → Modules              | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD                            |
| Family switcher             | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD (UI present)               |
| Module header               | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD                            |
| Search deep link            | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD                            |
| Library link                | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD                            |
| Ask deep link               | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD                            |
| History/Timeline            | `/health/history` | `/insurance/timeline` | `/vehicles/timeline` | None     | `/finance/history` | `/property/history` | **BAD INCONSISTENCY**           |
| Status vocabulary           | Contract          | Mostly                | Mostly               | Mostly   | Mostly             | Mostly              | GOOD DIFFERENCE (domain labels) |
| Empty states                | Strong            | Strong                | Strong               | Generic  | Generic            | Generic             | BAD (non-health/generic)        |
| Loading states              | Strong            | Good                  | Good                 | Partial  | Partial            | Partial             | BAD INCONSISTENCY               |
| Error states                | Strong            | Good                  | Partial              | Partial  | Partial            | Partial             | BAD INCONSISTENCY               |
| Privacy section in settings | Yes               | Yes                   | Yes                  | Yes      | Yes                | Yes                 | GOOD                            |
| Mobile bottom nav highlight | Modules           | Modules               | Modules              | Modules  | Modules            | **Home (bug)**      | **BAD INCONSISTENCY**           |
| Tab count                   | 5                 | 6                     | 3                    | 2        | 2                  | 3                   | GOOD DIFFERENCE                 |

---

## Part 4 — Duplication Audit

| Duplicate surface  | Locations                                                                   | Intentional?         | Verdict                                             |
| ------------------ | --------------------------------------------------------------------------- | -------------------- | --------------------------------------------------- |
| Ask UI             | `/ask` + legacy `/health/ask`, `/insurance/ask`, `/vehicles/ask` redirects  | Redirect intentional | OK (redirects)                                      |
| Ask engines        | Health pipeline + universal + legacy `useInsuranceAsk`/`useVehicleAsk`      | Partially            | **REDUNDANT** dead code                             |
| Timeline           | `/timeline` + `/insurance/timeline` + `/vehicles/timeline` + health history | Partially            | **REDUNDANT SURFACE** for insurance/vehicles        |
| Timeline providers | 8 registered vs platform bootstrap 7 (missing property)                     | No                   | **BAD INCONSISTENCY**                               |
| Timeline search    | `timeline-knowledge.provider` (health+docs only) vs full federated engine   | No                   | **REDUNDANT/STALE**                                 |
| Library documents  | Module providers + `documents-module.provider` catch-all                    | Partially            | **REDUNDANT SURFACE** for identity/finance/property |
| Health knowledge   | Two provider stacks (search vs ask)                                         | No                   | **BAD INCONSISTENCY**                               |
| Search registry    | `searchChronicle` vs unused `searchAllContributors`                         | No                   | **REDUNDANT** dead code                             |
| Settings routes    | `/settings/*` → profile redirects                                           | Legacy               | OK                                                  |
| Import routes      | 5+ health import paths → review-documents                                   | Legacy               | OK but noisy                                        |

---

## Part 5 — Library Audit

**Trace:** Module canonical docs → module provider (`*-module.provider.ts`) → `buildFederatedLibraryView()` → category → document detail → module detail.

| Check                             | Status               | Evidence                                                                                             |
| --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| Single source of truth per module | Partial              | Federated providers authoritative; `chronicle_documents` catch-all may duplicate                     |
| Duplicate document rows           | **Risk**             | `documents-module.provider` excludes medical/insurance/vehicles only — not identity/finance/property |
| Correct counts (real data)        | Health+Insurance yes | 40 estimated total (21 health + 19 insurance)                                                        |
| Member filtering                  | CODE-REVIEW          | Providers accept member scope; **NOT VALIDATED** cross-member on real data                           |
| Module labels                     | OK                   | Provider metadata                                                                                    |
| Deep links                        | Partial              | Detail routes exist; few Playwright tests                                                            |
| Privacy                           | CODE-REVIEW          | **NOT VALIDATED**                                                                                    |
| Empty/loading/error               | Present              | Consumer copy from contract                                                                          |

**What is Library for?**

Intended: cross-module document browse — "everything Chronicle has organized."

Actual: federated module sections plus a general documents bucket with overlapping categories.

**Verdict:** Purpose is **unclear to users** — reads as a dumping ground when catch-all section duplicates module sections. **P1.**

---

## Part 6 — Search Audit

| Module          | Provider                          | `search()` | Context label      | Deep links | Empty state | Privacy           |
| --------------- | --------------------------------- | ---------- | ------------------ | ---------- | ----------- | ----------------- |
| Health          | `health-knowledge.provider`       | Yes        | Health · Report    | Yes        | Yes         | NOT VALIDATED     |
| Insurance       | `insurance-intelligence.provider` | Yes        | Insurance · Policy | Yes        | Yes         | NOT VALIDATED     |
| Vehicles        | `vehicles-intelligence.provider`  | Yes        | Generic (no color) | Yes        | Yes         | NOT VALIDATED     |
| Identity        | `identity-intelligence.provider`  | Yes        | Identity           | Yes        | Yes         | NOT VALIDATED     |
| Finance         | `finance-intelligence.provider`   | Yes        | Finance            | Yes        | Yes         | NOT VALIDATED     |
| Property        | `property-intelligence.provider`  | Yes        | Property           | Yes        | Yes         | NOT VALIDATED     |
| Documents       | `documents-knowledge.provider`    | Yes        | Documents          | Yes        | Yes         | NOT VALIDATED     |
| Timeline (meta) | `timeline-knowledge.provider`     | Yes        | Timeline           | Partial    | Yes         | **Stale sources** |

**Missing:** Vehicles domain color/label in `global-search.service.ts`. Timeline search provider under-federated.

---

## Part 7 — Ask Audit

**Canonical surface:** `/ask` → `AskPage` → `AiAskReasoningEngine`

**Execution paths:**

| Path                          | Trigger                   | Grounded?                       | Latency              |
| ----------------------------- | ------------------------- | ------------------------------- | -------------------- |
| Health intelligence           | Health-only questions     | Yes (metrics/evidence)          | Lower for structured |
| Universal structured          | Cross-module / non-health | Evidence orchestrator           | Medium               |
| Universal narrative/companion | Fallback                  | Variable — **fabrication risk** | Higher               |

**Legacy (unused by routes):** `FigmaInsuranceAskScreen`, `useInsuranceAsk`, `useVehicleAsk`, `buildDomainCompanionAskTurn`

**QA coverage:** Playwright ask specs with QA interceptors. **Real-data Ask validation:** Health + Insurance facts reconciled; Vehicles/Identity/Finance/Property **NOT VALIDATED**.

**Privacy:** Cross-member isolation **NOT VALIDATED** on real data (QA synthetic family only).

**Broad vs structured latency:** NOT MEASURED in this audit pass.

---

## Part 8 — Document Pipeline Summary

See `docs/CHRONICLE_AI_EXTRACTION_AUDIT.md` for full trace.

**Headline:** Health is the only module with full discovery → OCR/layout → AI → persisted entity → knowledge graph on real data. Insurance follows domain orchestrator on real data. Vehicles pipeline exists but **never ran in production** (0 folder assignment). Identity/Finance have runners but 0 docs. Property has **no import runner**.

---

## Part 13 — Privacy Audit

**Method:** CODE-REVIEW of family scoping in providers + QA intercept patterns. **No real-data cross-member penetration test executed.**

| Surface        | Member scoping in code | Real-data tested |
| -------------- | ---------------------- | ---------------- |
| Home           | Yes                    | NOT VALIDATED    |
| Library        | Provider-level         | NOT VALIDATED    |
| Search         | Provider-level         | NOT VALIDATED    |
| Ask            | Engine-level           | NOT VALIDATED    |
| Timeline       | Source builders        | NOT VALIDATED    |
| Module details | Context hooks          | NOT VALIDATED    |

**Sensitive identifier masking:** CODE-REVIEW ONLY — passport/account masking logic exists in identity/finance builders but **NOT VALIDATED**.

**P0 risk if untested:** Cross-member document leakage via Library/search/Ask on shared Drive folders.

---

## Part 14 — Empty / Loading / Error States

| Module    | Empty   | Loading | Error   | Partial | Attention | Not configured         |
| --------- | ------- | ------- | ------- | ------- | --------- | ---------------------- |
| Health    | Strong  | Strong  | Strong  | Yes     | Yes       | Yes                    |
| Insurance | Strong  | Good    | Good    | Yes     | Yes       | Yes                    |
| Vehicles  | Good    | Good    | Partial | Yes     | Yes       | Yes (real: stuck here) |
| Identity  | Generic | Partial | Partial | Unknown | Unknown   | Yes                    |
| Finance   | Generic | Partial | Partial | Unknown | Unknown   | Yes                    |
| Property  | Generic | Partial | Partial | Unknown | Unknown   | Yes                    |
| Library   | Yes     | Yes     | Partial | Yes     | N/A       | Yes                    |
| Ask       | Yes     | Yes     | Partial | Yes     | N/A       | N/A                    |

Non-health modules often use `MODULE_UX_COPY.emptyGeneric` — lacks domain-specific guidance.

---

## Part 15 — Responsive UX

**Automated coverage:** `e2e/chronicle/responsive-a11y-visual.spec.ts` — 12 paths at mobile viewport, horizontal overflow check + screenshots.

**Paths tested:** home, modules, 6 module homes, library, ask, timeline, profile.

**NOT tested:** Detail routes, settings sub-pages, finance history, insurance sub-routes, modals, family switcher overflow, tablet breakpoint explicitly.

**Known issues (code-review):** Property bottom-nav highlight bug; finance history outside tabs; long document names not systematically tested.

---

## Part 16 — Visual Audit

**Screenshot spec:** QA full dataset only — **not real data screens**.

**Evaluation:**

| Aspect           | Score | Notes                                                |
| ---------------- | ----- | ---------------------------------------------------- |
| Visual hierarchy | 6/10  | Health/Insurance strong; other modules empty/generic |
| Balance          | 6/10  | Hub cards balanced; Library cluttered potential      |
| Spacing          | 7/10  | Tailwind consistent                                  |
| Consistency      | 6/10  | Timeline fragmentation hurts                         |
| Density          | 6/10  | Health well-dosed; finance/property sparse           |
| Premium feel     | 6/10  | Not yet "one personal OS" — feels modular            |
| Clarity          | 7/10  | Consumer copy improved                               |
| Repetition       | 5/10  | Multiple timelines, duplicate library rows           |
| Clutter          | 6/10  | Mail/tasks orphans; advanced dev links               |

**NOT VALIDATED:** Pixel comparison across breakpoints for all production screens.

---

## Part 17 — Accessibility

**Automated:** `responsive-a11y-visual.spec.ts` includes basic a11y checks on 12 paths (QA mode).

| Area             | Status                                     |
| ---------------- | ------------------------------------------ |
| Ask input labels | Partial — CODE-REVIEW                      |
| Search input     | Present                                    |
| Library headings | Semantic — partial                         |
| Family switcher  | CODE-REVIEW — keyboard/focus NOT VALIDATED |
| Settings forms   | Partial                                    |
| Document detail  | NOT VALIDATED                              |
| Contrast         | NOT VALIDATED systematically               |

---

## Part 18 — Performance

**NOT MEASURED** in this audit pass (no Lighthouse/profiler runs).

**Code-review concerns:**

| Area             | Concern                                                     |
| ---------------- | ----------------------------------------------------------- |
| Ask latency      | Multiple engine paths; broad questions may hit companion AI |
| Library          | Federated 7 providers sequential aggregation                |
| Health home      | Multiple parallel queries                                   |
| Timeline         | 8 providers merged                                          |
| Repeated queries | React Query stale times vary — possible duplicate fetches   |

---

## Part 19 — Test Coverage Map

| Area                  | Unit    | Integration                       | Playwright    | Visual  | Quality              |
| --------------------- | ------- | --------------------------------- | ------------- | ------- | -------------------- |
| Routes (35 contracts) | Partial | No                                | Yes           | Partial | Render-only for most |
| Health pipeline       | Strong  | Yes                               | Yes           | Partial | Good                 |
| Insurance pipeline    | Good    | Yes (`RUN_INSURANCE_MATERIALIZE`) | Yes           | No      | Good                 |
| Vehicles pipeline     | Good    | Yes (fails without assignment)    | Yes (QA seed) | No      | **QA-only**          |
| Identity              | Partial | No                                | Yes (render)  | No      | Weak                 |
| Finance               | Partial | No                                | Yes (render)  | No      | Weak                 |
| Property              | Partial | No                                | Yes (render)  | No      | Weak                 |
| Library federation    | Yes     | Partial                           | Partial       | Yes     | Moderate             |
| Search                | Partial | No                                | Partial       | No      | Moderate             |
| Ask                   | Yes     | Partial                           | Yes           | No      | Moderate             |
| Privacy               | Minimal | No                                | No            | No      | **Gap**              |
| OCR/AI extraction     | Partial | Health yes                        | No            | No      | Moderate             |

**346+ QA gate tests exist** — passing tests do **not** imply production readiness for unconnected modules.

---

## Part 21 — Final Scorecard

| Dimension                | Score | Rationale                                                     |
| ------------------------ | ----- | ------------------------------------------------------------- |
| Navigation               | 6/10  | Property nav bug; orphan mail/tasks; finance history off-tabs |
| Information Architecture | 6/10  | Timeline fragmentation; Library purpose unclear               |
| Visual UX                | 6/10  | Health/Insurance polished; rest empty or generic              |
| Cross-module consistency | 5/10  | Contract exists but uneven adoption                           |
| Library                  | 5/10  | Duplication risk; unclear user purpose                        |
| Search                   | 6/10  | All providers present; styling gaps; stale timeline provider  |
| Ask                      | 6/10  | One UI; multiple engines; privacy unvalidated                 |
| Health                   | 8/10  | Real-data proven; reference implementation                    |
| Insurance                | 7/10  | Real-data proven; expiry gaps on non-motor                    |
| Vehicles                 | 3/10  | Pipeline exists; **zero production entities**                 |
| Identity                 | 3/10  | No real data; OCR/heuristic only                              |
| Finance                  | 3/10  | No real data; AI-only fields                                  |
| Property                 | 2/10  | No import pipeline; heuristic knowledge only                  |
| AI extraction            | 5/10  | Two stacks; heavy heuristics outside Health                   |
| OCR architecture         | 5/10  | No native text path; Identity OCR-primary                     |
| Knowledge                | 6/10  | Health+Insurance solid; rest thin                             |
| Evidence                 | 6/10  | Health strong; universal path variable                        |
| Privacy                  | 4/10  | **NOT VALIDATED** on real data                                |
| Responsive UX            | 6/10  | 12-path smoke only                                            |
| Accessibility            | 5/10  | Limited automated coverage                                    |
| Performance              | 5/10  | NOT MEASURED                                                  |
| Test coverage            | 6/10  | Wide QA gate; shallow UX/real-data coverage                   |

### **Overall Chronicle Product Readiness: 5/10**

**Not beta-ready.** Health and Insurance demonstrate the target experience on real data. Vehicles claim is contradicted by production DB (`vehicle_folder_assignments = 0`). Identity, Finance, Property are UI shells without validated ingestion.

---

## Part 22 — Findings (P0 / P1 / P2)

### P0 — Privacy / data corruption / fabrication / security

| ID    | Module    | Problem                                                                 | Evidence                                      | Impact                               | Fix                                                           | Real-data     | QA          |
| ----- | --------- | ----------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ | ------------------------------------------------------------- | ------------- | ----------- |
| P0-01 | Privacy   | Cross-member isolation not validated on real data                       | No penetration test; family scoping code-only | Document/fact leakage across members | Real-data family isolation test suite                         | NO            | Partial     |
| P0-02 | Insurance | Synthetic policy numbers from heuristic fallback may display as factual | `insurerId:policyType:fileStem` in processing | User trusts invented policy numbers  | Label heuristic fields; block display without AI confirmation | Partial       | CODE-REVIEW |
| P0-03 | Ask       | Universal narrative path may answer without evidence                    | `resolveUniversalAskTurn` companion fallback  | Fabricated answers                   | Require evidence or explicit "I don't know"                   | NOT VALIDATED | Partial     |

### P1 — Major UX / architecture / functionality

| ID    | Module           | Problem                                               | Evidence                                              | Impact                                             | Fix                                            | Real-data         | QA          |
| ----- | ---------------- | ----------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------- | ----------------- | ----------- |
| P1-01 | Vehicles         | No production folder assignment — pipeline never ran  | `vehicle_folder_assignments: 0`; sync error           | Entire Vehicles module non-functional on real data | User must persist assignment; re-sync          | YES (confirmed 0) | QA-only UI  |
| P1-02 | Vehicles         | User believed Vehicles connected; DB contradicts      | Conversation + DB trace                               | False readiness signal                             | Fix assignment persistence UX; verify DB write | YES               | N/A         |
| P1-03 | Property         | No import/processing pipeline                         | No `property-import-runner`                           | Property module cannot ingest Drive docs           | Build pipeline mirroring Health pattern        | YES (0 docs)      | Render only |
| P1-04 | Library          | Unclear purpose; catch-all duplicates module sections | `documents-module.provider` exclusion list incomplete | User confusion; duplicate rows                     | Define Library scope; dedupe                   | Partial           | Partial     |
| P1-05 | Timeline         | Three timeline surfaces (life + insurance + vehicles) | Separate routes and data sources                      | Cognitive overload                                 | Consolidate or clearly differentiate           | CODE-REVIEW       | Partial     |
| P1-06 | Timeline         | Property provider missing from platform bootstrap     | `register-timeline-providers.ts`                      | Property events missing from life timeline         | Add property to bootstrap                      | CODE-REVIEW       | N/A         |
| P1-07 | OCR              | No native PDF text extraction in production           | grep: native text test-only                           | Unnecessary OCR cost/latency on text PDFs          | Add native text read before OCR                | CODE-REVIEW       | N/A         |
| P1-08 | Navigation       | Property routes highlight Home not Modules            | `MODULE_ROUTE_PREFIXES` omits property                | Wrong nav context                                  | Add property prefix                            | CODE-REVIEW       | N/A         |
| P1-09 | Insurance        | Expiry dates missing for most non-motor policies      | real-data-validation shows "—"                        | Users miss renewal signals                         | Improve AI extraction for expiry               | YES               | N/A         |
| P1-10 | Identity/Finance | Zero real documents — modules unproven                | `identity/finance documents: 0`                       | Beta claims impossible                             | Connect folders; run sync; validate            | YES               | Render only |
| P1-11 | Ask              | Legacy Ask hooks/screens still in codebase            | `useInsuranceAsk`, `FigmaInsuranceAskScreen`          | Maintenance confusion                              | Remove or clearly deprecate                    | CODE-REVIEW       | N/A         |
| P1-12 | Health knowledge | Dual knowledge provider stacks                        | Two `health-knowledge.provider` paths                 | Search/Ask drift                                   | Consolidate to one canonical builder           | CODE-REVIEW       | Partial     |

### P2 — Polish / minor inconsistency

| ID    | Module                  | Problem                                | Evidence                      | Impact                 | Fix                            | Real-data   | QA      |
| ----- | ----------------------- | -------------------------------------- | ----------------------------- | ---------------------- | ------------------------------ | ----------- | ------- |
| P2-01 | Shell                   | Orphan `/mail` and `/tasks` routes     | Zero nav links                | Dead weight            | Remove or hide                 | CODE-REVIEW | N/A     |
| P2-02 | Finance                 | `/finance/history` not in module tabs  | FinanceLayout                 | Discoverability        | Add tab or link from home      | CODE-REVIEW | Yes     |
| P2-03 | Search                  | Vehicles missing domain color/label    | `global-search.service.ts`    | Inconsistent search UI | Add vehicles case              | CODE-REVIEW | N/A     |
| P2-04 | Documents               | Tab label mismatch (Browse vs Library) | documents-nav vs layout       | Minor confusion        | Align copy                     | CODE-REVIEW | N/A     |
| P2-05 | Personal                | `/personal` module orphaned (no tabs)  | Single page                   | Feels unfinished       | Integrate or remove from hub   | CODE-REVIEW | N/A     |
| P2-06 | Non-health empty states | Generic empty copy                     | `MODULE_UX_COPY.emptyGeneric` | Weak guidance          | Domain-specific empty messages | CODE-REVIEW | Partial |
| P2-07 | Search                  | Dead `registerSearchContributor` API   | Zero callers                  | Confusion              | Remove or wire                 | CODE-REVIEW | N/A     |
| P2-08 | Health                  | Stale `/health/ask` in health-nav.ts   | Unused constant               | Noise                  | Clean up                       | CODE-REVIEW | N/A     |

---

## Part 23 — Final Questions (Explicit Answers)

1. **Have we validated every production screen?**  
   **No.** 35 Playwright route contracts + 12 responsive screenshots on QA data. Detail routes, profile sub-routes, mail/tasks, and real-data states are largely **NOT VALIDATED**.

2. **Which screens have ONLY render validation?**  
   Identity, Finance, Property module homes/settings/history; Personal; Mail; Tasks; most detail routes (`/:id`, `/:slug`); profile sub-routes except family; documents index/expiring.

3. **Which screens are visually weak or cluttered?**  
   Mail, Tasks, Personal (orphaned); Library (potential duplicate sections); Insurance+Vehicles module timelines overlapping life timeline concept; empty Vehicle/Identity/Finance/Property homes on real data.

4. **Are there duplicate/redundant surfaces?**  
   **Yes.** Timeline (3 surfaces), Library catch-all vs module sections, legacy Ask hooks, dual health knowledge stacks, timeline search provider stale vs federated engine.

5. **Is Library genuinely useful and understandable?**  
   **Partially.** Useful as cross-module browse; **not understandable** as a product surface — risks becoming a dumping ground. **P1.**

6. **Is there ONE canonical Ask?**  
   **Yes for UI** (`/ask`). **No for execution** — three live pipelines (health, universal structured, universal narrative) plus dead legacy code.

7. **Is there ONE canonical Timeline?**  
   **No.** `/timeline` (federated life), `/insurance/timeline`, `/vehicles/timeline`, and `/health/history` (health's canonical) coexist.

8. **Is document understanding primarily AI-based like Health?**  
   **No.** Only Health uses OCR+layout+AI as integrated stack. Insurance/Vehicles/Finance use AI with heavy heuristic fallback. Identity is OCR+regex. Property has no extraction.

9. **Exactly where is OCR used?**  
   Google Document AI via `document-ocr` edge function: Health processing (primary after AI-direct fail), Identity processing (primary), Insurance/Vehicles/Finance (fallback in domain orchestrator), generic document upload.

10. **Can native text PDFs bypass OCR?**  
    **Partially.** AI-direct can read PDF bytes without OCR on all modules that use domain extraction + Health. There is **no dedicated native-text extraction path** — failed AI-direct still hits OCR.

11. **Which modules rely heavily on filename/folder heuristics?**  
    **Property** (entirely), **Identity** (type/owner), **Vehicles** (identity/classification), **Insurance** (fallback insurer/policy/category), **Finance** (classification only — fields are AI-only).

12. **Which facts can be shown without AI evidence?**  
    Insurance policy numbers/insurers (heuristic fallback), Vehicle registration/VIN (regex), Identity doc types (filename), Property names (folder path), Finance doc labels (filename). **Risk: presented as factual without confidence labeling.**

13. **Which modules are genuinely real-data validated?**  
    **Health** (25 reports, 910 metrics) and **Insurance** (9 policies, 10 docs, motor expiries reconciled).

14. **Which modules are only QA/mock validated?**  
    **Vehicles** (QA synthetic seed; 0 production entities), **Identity**, **Finance**, **Property** (render + QA intercepts only).

15. **Are there privacy gaps?**  
    **Yes — NOT VALIDATED.** Code suggests member scoping; no real-data cross-member penetration test performed. **P0-01.**

16. **Are there mobile UX gaps?**  
    Property bottom-nav bug; finance history off-tabs; detail routes untested; family switcher overflow NOT VALIDATED.

17. **Are there visual quality gaps?**  
    Yes — empty modules on real data, orphan pages, timeline duplication, Library clutter potential.

18. **What must be fixed before beta-ready?**  
    See Recommended Implementation Order below.

---

## Recommended Implementation Order

### Gate 0 — Blockers (before any beta label)

1. **P0-01** — Real-data privacy isolation tests (Home, Library, Search, Ask, Timeline) across Primary/Spouse/Child/Parent
2. **P1-01 / P1-02** — Vehicles folder assignment persistence + real sync validation (`RUN_VEHICLE_E2E=1`)
3. **P0-02 / P0-03** — Heuristic facts must not display as confirmed; Ask must refuse when no evidence

### Gate 1 — Core module parity

4. **P1-03** — Property import/processing pipeline (mirror Health discovery → extract → entity)
5. **P1-10** — Identity + Finance real folder connection + sync + validation
6. **P1-09** — Insurance expiry extraction for life/home/health policies
7. **P1-07** — Native PDF text before OCR

### Gate 2 — Platform coherence

8. **P1-04** — Library scope definition + deduplication
9. **P1-05 / P1-06** — Timeline consolidation or explicit UX differentiation; fix property bootstrap
10. **P1-12** — Consolidate health knowledge stacks
11. **P1-08** — Property nav prefix fix

### Gate 3 — Polish

12. P2 items (orphan routes, search styling, empty copy, dead code cleanup)
13. Full responsive + a11y pass on detail routes
14. Performance measurement (Ask structured vs broad, Library aggregation)

---

## Validation Matrix (Part 20)

| Claim                               | Status                                                         |
| ----------------------------------- | -------------------------------------------------------------- |
| Health ingestion on real Drive data | **PROVEN WITH REAL DATA**                                      |
| Insurance sync on real Drive data   | **PROVEN WITH REAL DATA**                                      |
| Vehicles sync on real Drive data    | **NOT VALIDATED** (0 assignments, 0 entities)                  |
| Identity/Finance/Property sync      | **NOT VALIDATED**                                              |
| Library counts match modules        | **PROVEN WITH REAL DATA** (health+insurance only)              |
| Ask answers grounded                | **PARTIAL** — health yes; universal NOT VALIDATED on real data |
| Privacy isolation                   | **NOT VALIDATED**                                              |
| Mobile responsive                   | **QA DATA ONLY** — 12 paths                                    |
| Visual quality all screens          | **NOT VALIDATED**                                              |
| OCR policy correct                  | **CODE-REVIEW ONLY**                                           |

---

## Related Documents

- `docs/CHRONICLE_ROUTE_INVENTORY.md` — Part 1
- `docs/CHRONICLE_AI_EXTRACTION_AUDIT.md` — Parts 8–12 field/OCR detail
- `docs/VEHICLE_REAL_DATA_TRACE.md` — Vehicles production DB trace

---

**Audit complete. No code, UI, database, AI, OCR, or routing changes were made.**
