# Real Data Validation Report

**Date:** 2026-08-21  
**Method:** Read-only Supabase inventory + pipeline code review (no QA mode, no synthetic data, no mutations)  
**Account:** Primary family owner `[MASKED:8d…f7]` · 3 active family members  
**Constraint:** No UI mutations, no reprocess, no fixes applied

---

## Executive decision

### **REAL-DATA READY AFTER FIXES**

Health ingestion is materially correct and rich (25 reports, 910 metrics, 2026 data present). Insurance, vehicles, identity, finance, and property are **incomplete relative to Drive registry inventory**. Library universal documents table is empty. Several modules lack folder roots. UI-level Search/Ask/Family/Timeline validation requires a signed-in session and was not fully executed in this pass.

**Real-data trust score: 5/10**

| Area           | Score | Notes                                                        |
| -------------- | ----: | ------------------------------------------------------------ |
| Health         |  8/10 | Strong report + metric corpus; 5 needs_review registry files |
| Insurance      |  4/10 | 10 Drive insurance files; only 2 motor policies materialized |
| Vehicles       |  2/10 | No vehicle folder assignment; 0 vehicle records              |
| Identity       |  1/10 | No module documents in DB                                    |
| Finance        |  1/10 | No module documents in DB                                    |
| Property       |  1/10 | No module documents in DB                                    |
| Library        |  1/10 | `chronicle_documents` count = 0                              |
| Drive pipeline |  6/10 | Connected; 41 queued imports; 2 failed                       |

---

## 1. Drive inventory

| Module root   | Folder connected | Assignments |          Registry files |  Imported |   Failed |  Skipped | Needs review |
| ------------- | ---------------- | ----------: | ----------------------: | --------: | -------: | -------: | -----------: |
| **Health**    | Yes              |           2 |   25 (`likely_medical`) | 24 total* |        2 |        2 |            5 |
| **Insurance** | Yes              |           1 | 10 (`insurance_policy`) |  (shared) | (shared) | (shared) |     (shared) |
| **Vehicles**  | **No**           |           0 |                       — |         — |        — |        — |            — |
| **Identity**  | **No**           |           0 |                       — |         — |        — |        — |            — |
| **Finance**   | **No**           |           0 |                       — |         — |        — |        — |            — |
| **Property**  | **No**           |           0 |                       — |         — |        — |        — |            — |

\*Registry totals are user-wide (42 files): 17 discovered, 24 completed import, 2 failed, 2 skipped, 0 unresolved category.

**Drive connected:** Yes (Google Drive connector active)  
**Recursive discovery:** Registry populated (42 files) — implies discovery ran  
**Import queue backlog:** 41 items pending  
**Last sync run:** None recorded in `connector_sync_runs`

### Inventory reconciliation (Drive vs Chronicle)

| Module    | Drive registry signal |     Chronicle persisted |     Missing | Unexpected |      Duplicates |     Unresolved |
| --------- | --------------------: | ----------------------: | ----------: | ---------: | --------------: | -------------: |
| Health    |            25 medical |     25 `health_reports` |        ~0** |          0 | 0 file-key dups | 5 needs_review |
| Insurance |        10 policy PDFs |     2 policies + 3 docs | ~8 policies |          0 |               0 |              0 |
| Vehicles  |  (in insurance/motor) |              0 vehicles |         All |          — |               0 |              — |
| Identity  |               Unknown |                       0 |         All |          0 |               0 |              — |
| Finance   |               Unknown |                       0 |         All |          0 |               0 |              — |
| Property  |               Unknown |                       0 |         All |          0 |               0 |              — |
| Library   |           42 registry | 0 `chronicle_documents` |          42 |          0 |               0 |              — |

**Health missing caveat:** 5 registry files tagged `needs_review` may not yet be health reports.

---

## 2. Health reconciliation

| Check                                        | Result                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| Latest report                                | 2026-04-23 — _Apr 2026 - Full Body Checkup.pdf_      |
| 2026 reports                                 | **8** of 25 total                                    |
| Metrics stored                               | **910** observations                                 |
| Latest LDL                                   | **95.70 mg/dl** (normal) on 2026-04-23               |
| Workflow items                               | 42                                                   |
| UI trace (Home/Progress/History/Reports/Ask) | **Not executed live** — DB supports expected screens |

**Assessment:** Health pipeline has produced a coherent longitudinal corpus. Manual UI spot-check of 10 facts still recommended but DB lineage is consistent.

---

## 3. Insurance reconciliation

**Required categories:** Health · Term/Life · Vehicle · Home

| Category        | Policies in DB | Evidence                                                        |
| --------------- | -------------: | --------------------------------------------------------------- |
| Vehicle (motor) |          **2** | IndusInd OD (exp 2027-03-18), Reliance bundled (exp 2028-03-18) |
| Health          |          **0** | —                                                               |
| Term/Life       |          **0** | —                                                               |
| Home            |          **0** | —                                                               |

**Drive:** 10 files classified `insurance_policy` in registry  
**Gap:** 8 registry insurance files not reflected as typed policies (P1 — extraction/classification)

---

## 4. Vehicle reconciliation

| Check                     | Result                                            |
| ------------------------- | ------------------------------------------------- |
| `vehicles` table          | **0** records                                     |
| `vehicle_documents`       | **0**                                             |
| Vehicle folder assignment | **0**                                             |
| Motor insurance policies  | 2 (vehicle identity not linked to vehicle entity) |

**Assessment:** Vehicle module not wired to Drive root. Motor policies exist without vehicle graph (P1).

---

## 5. Identity reconciliation

| Check              | Result                                         |
| ------------------ | ---------------------------------------------- |
| Identity documents | **0** in `chronicle_documents`                 |
| Folder root        | Not connected                                  |
| Privacy masking    | **Not live-tested** (no signed-in Ask session) |

---

## 6. Finance reconciliation

| Check                   | Result                       |
| ----------------------- | ---------------------------- |
| Finance documents       | **0**                        |
| Folder root             | Not connected                |
| Duplicate/stale records | None observed (empty module) |

---

## 7. Property reconciliation

| Check                | Result                                                  |
| -------------------- | ------------------------------------------------------- |
| Property documents   | **0**                                                   |
| Folder root          | Not connected                                           |
| Property Home/Detail | **Cannot validate** without persisted property entities |

---

## 8. Library reconciliation

| Check                         | Result           |
| ----------------------------- | ---------------- |
| `chronicle_documents`         | **0** rows       |
| Cross-module Library location | **Empty**        |
| View in module → entity       | **Not testable** |

**Note:** Health uses `health_reports`; insurance uses `insurance_documents`. Universal Library appears unpopulated despite Drive imports (P1).

---

## 9. Search validation

**Status:** Not executed (requires authenticated UI session).  
**Risk:** Property global search provider known gap per `BETA_FRICTION_LOG.md` (P1 deferred).

---

## 10. Ask validation

**Status:** Not executed live against production session in this pass.

| Question                            | Synthetic QA result | Real-data status                                        |
| ----------------------------------- | ------------------- | ------------------------------------------------------- |
| What is my latest LDL?              | ~5s structured      | **Likely OK** — LDL 95.70 in DB                         |
| What insurance policies do I have?  | Structured          | **Partial** — only motor in policies table              |
| When does my car insurance expire?  | Structured          | **Likely OK** — 2027/2028 motor expiries                |
| What is my home loan balance?       | Structured          | **Unknown** — no finance data                           |
| When does my passport expire?       | Structured          | **Unknown** — no identity data                          |
| What properties do I have?          | Structured          | **Unknown** — no property data                          |
| Show me everything about my XEV 9e. | 90s timeout (QA)    | **Separate track** — narrative path; not a gate failure |

---

## 11. Family validation

| Check                              | Result                    |
| ---------------------------------- | ------------------------- |
| Family members in DB               | **3** active              |
| Cross-member leakage               | **Not live-tested**       |
| Per-member Home/Library/Search/Ask | **Requires signed-in UI** |

**Privacy:** No raw identifiers exported in this report. Live P0 privacy test still mandatory.

---

## 12. Timeline validation

| Check                       | Result                                                                 |
| --------------------------- | ---------------------------------------------------------------------- |
| `chronicle_timeline_events` | Table empty or unavailable                                             |
| Technical events filtered   | Code path exists (`filterLifeTimelineEvents`) — **not validated live** |

---

## 13. AI / extraction policy (code + runtime signals)

Observed from pipeline + DB state (not speculative):

| Stage            | Health                                                       | Insurance             | Other modules   |
| ---------------- | ------------------------------------------------------------ | --------------------- | --------------- |
| Drive discovery  | Yes (42 registry)                                            | Yes (10 tagged)       | No folder roots |
| Download/import  | 24 completed                                                 | 3 insurance_documents | —               |
| Extraction/AI    | Reports completed; 910 metrics                               | 2 policies derived    | —               |
| Persistence      | `health_reports`, `health_metrics`                           | `insurance_policies`  | Empty           |
| Failed PDFs      | **2** registry failures                                      | —                     | —               |
| OCR provider env | `VITE_OCR_PROVIDER=mock` in `.env.example`; local may differ | —                     | —               |

**Actual behavior:** Health PDFs have been processed to structured metrics. Insurance PDFs partially derived (motor only). Broad module documents not landing in universal Library.

---

## 14. Backfill validation (code review)

Health backfill/reprocess is gated in processing services — normal page loads should not bulk-invoke AI. **Not runtime-verified** in this pass (no network trace). Recommend signed-in observation of Health home load with network tab for repeated `ask-ai`/OCR calls.

---

## 15. Reprocess / retry

**Not executed** per instructions (no mutations).

---

## 16. Duplicate detection

| Domain             |         Duplicates found |
| ------------------ | -----------------------: |
| Document file keys |                        0 |
| Insurance policies |                0 obvious |
| Health metrics     | Not exhaustively scanned |
| Timeline           |              N/A (empty) |

---

## 17. Real Data Trust Table (20+ facts)

| Module    | Fact                   | Chronicle value | Source document                  | Source date | Member | Match   | Notes          |
| --------- | ---------------------- | --------------- | -------------------------------- | ----------- | ------ | ------- | -------------- |
| Health    | Latest lab report date | 2026-04-23      | Apr 2026 - Full Body Checkup.pdf | 2026-04-23  | P••••  | DB      | completed      |
| Health    | Latest LDL             | 95.70 mg/dl     | [MASKED report]                  | 2026-04-23  | P••••  | DB      | normal         |
| Health    | Total reports          | 25              | health_reports                   | —           | —      | DB      | —              |
| Health    | 2026 reports           | 8               | health_reports                   | 2026        | —      | DB      | —              |
| Health    | Stored metrics         | 910             | health_metrics                   | —           | —      | DB      | —              |
| Health    | Workflow items         | 42              | health_workflow_items            | —           | —      | DB      | —              |
| Health    | Registry medical files | 25              | connector registry               | —           | —      | DB      | likely_medical |
| Health    | Needs review files     | 5               | connector registry               | —           | —      | DB      | needs_review   |
| Insurance | Motor policies         | 2               | insurance_policies               | —           | N••••  | DB      | —              |
| Insurance | Motor expiry A         | 2027-03-18      | IndusInd OD policy               | 2026-03-19  | N••••  | DB      | active         |
| Insurance | Motor expiry B         | 2028-03-18      | Reliance bundled                 | 2025-03-19  | N••••  | DB      | active         |
| Insurance | Registry policy PDFs   | 10              | connector registry               | —           | —      | DB      | 8 not typed    |
| Insurance | Insurance documents    | 3               | insurance_documents              | —           | —      | DB      | —              |
| Insurance | Health policies        | 0               | —                                | —           | —      | **Gap** | P1             |
| Insurance | Term/Life policies     | 0               | —                                | —           | —      | **Gap** | P1             |
| Insurance | Home policies          | 0               | —                                | —           | —      | **Gap** | P1             |
| Vehicles  | Vehicle records        | 0               | —                                | —           | —      | **Gap** | P1             |
| Vehicles  | Vehicle folder         | Not connected   | —                                | —           | —      | **Gap** | P1             |
| Library   | Universal documents    | 0               | chronicle_documents              | —           | —      | **Gap** | P1             |
| Drive     | Import queue backlog   | 41              | connector_import_queue           | —           | —      | DB      | P1             |
| Drive     | Failed imports         | 2               | connector registry               | —           | —      | DB      | P1             |
| Family    | Active members         | 3               | family_members                   | —           | —      | DB      | —              |
| Identity  | Documents              | 0               | —                                | —           | —      | **Gap** | P1             |
| Finance   | Documents              | 0               | —                                | —           | —      | **Gap** | P1             |
| Property  | Documents              | 0               | —                                | —           | —      | **Gap** | P1             |

---

## P0 — Real product issues

**None confirmed from read-only DB pass.**

Live P0 checks still required: family-scope privacy in Ask, wrong-person attribution, fabricated answers.

---

## P1 — Important gaps

| ID       | Issue                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------- |
| RD-P1-01 | Universal Library empty (`chronicle_documents` = 0) despite 42 registry imports                 |
| RD-P1-02 | Insurance: 10 Drive policy files → only 2 motor policies; missing health/term/home categories   |
| RD-P1-03 | Vehicles module: no folder root, 0 vehicles, motor policies not linked to vehicle entities      |
| RD-P1-04 | Identity / Finance / Property: no folder roots, no persisted documents                          |
| RD-P1-05 | 41 items stuck in import queue                                                                  |
| RD-P1-06 | 2 failed registry imports                                                                       |
| RD-P1-07 | 5 health registry files in `needs_review`                                                       |
| RD-P1-08 | Signed-in UI validation not completed (Search, Ask, Family scope, Timeline, Library navigation) |

---

## P2 — Minor / deferred

| ID       | Issue                                                                              |
| -------- | ---------------------------------------------------------------------------------- |
| RD-P2-01 | No recorded `connector_sync_runs` (sync observability gap)                         |
| RD-P2-02 | XEV broad narrative Ask timeout (diagnosed separately; not a regression gate item) |
| RD-P2-03 | Property Search provider gap (known from beta friction log)                        |

---

## Validation tooling

Read-only script (local, not CI gate):

```bash
node scripts/real-data-validation.mjs
```

Output: `test-results/real-data-validation.json` (masked)

---

## Recommended next steps (after your review)

1. Connect Drive roots for Vehicles, Identity, Finance, Property
2. Drain import queue (41) and resolve 2 failures + 5 needs_review
3. Re-run insurance extraction for 8 untyped policy PDFs
4. Populate or explain `chronicle_documents` vs module-specific tables
5. Signed-in UI pass for Search, Ask, Family scope, Timeline, Library deep links
6. Re-run this validation script + manual 10-fact UI trace

**STOP — no fixes implemented in this pass.**
