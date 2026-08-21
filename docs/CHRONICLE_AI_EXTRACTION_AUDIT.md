# Chronicle AI Extraction & OCR Audit

**Audit date:** 2026-08-21  
**Scope:** Document understanding pipelines for Health, Insurance, Vehicles, Identity, Finance, Property  
**Reference implementation:** Health  
**Method:** Code trace + real-data validation script output  
**Validation:** CODE-REVIEW + partial REAL-DATA (Health, Insurance only)

---

## Executive Summary

Chronicle has **two extraction stacks**, not one unified pipeline:

1. **Health stack** — AI-direct → OCR (Google Document AI) → layout parsers → AI-on-OCR-text → persisted metrics
2. **Domain stack** (Insurance, Vehicles, Finance) — AI-direct → OCR fallback → deterministic heuristics via `orchestrateDomainDocumentExtraction`
3. **Identity stack** — OCR-primary + passport parser + regex metadata (no AI document extraction)
4. **Property stack** — **No extraction pipeline**; knowledge derived from folder heuristics only

**OCR provider:** Google Document AI via Supabase edge function `document-ocr`. **Tesseract:** unused. **Native PDF text extraction:** test-only; not in production pipelines.

**Native text PDF bypass:** Health can bypass OCR via AI-direct PDF attachment. Other modules attempt AI-direct first; OCR runs only on AI-direct failure. There is **no production path** that reads embedded PDF text without OCR or AI.

---

## Global Pipeline Architecture

```
Drive file
  → discovery (module-specific)
  → download (Drive API)
  → text acquisition:
       ├─ AI-direct (Gemini reads PDF bytes)     ← preferred when succeeds
       ├─ OCR (Google Document AI)             ← fallback / primary (Identity)
       └─ Heuristics (filename/folder/regex)   ← fallback or sole source
  → structured extraction
  → canonical entity persistence
  → knowledge builder → Library / Search / Ask
```

**Key files:**

| Component                 | Path                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Domain orchestrator       | `src/features/document-import/services/document-extraction-orchestrator.service.ts` |
| Domain extraction         | `src/features/document-import/services/domain-document-extraction.service.ts`       |
| AI direct client          | `src/shared/ai/transport/extract-domain-document.client.ts`                         |
| OCR wrapper               | `src/features/document-import/services/domain-document-text.service.ts`             |
| Document intelligence     | `src/features/document-intelligence/pipeline/document-intelligence.pipeline.ts`     |
| OCR edge function         | `supabase/functions/document-ocr/ocr-orchestrator.ts`                               |
| Health AI extraction      | `src/features/health/services/health-ai-extraction.service.ts`                      |
| Ask pipeline (NOT import) | `src/shared/ai/pipeline/ai-platform.pipeline.ts`                                    |

---

## OCR Policy (Part 9)

### Where OCR occurs

| Path                                         | OCR role                          | Trigger                                                            |
| -------------------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| Health report processing                     | Primary (after AI-direct attempt) | `health-processing.service.ts` → `runDocumentIntelligencePipeline` |
| Health AI reprocess                          | Hydrate if missing                | `reprocessHealthReportWithAi`                                      |
| Insurance/Vehicles/Finance domain extraction | Fallback                          | `orchestrateDomainDocumentExtraction` step 2                       |
| Identity document processing                 | Primary                           | `documents-processing.service.ts` → document-intelligence pipeline |
| Generic chronicle document upload            | Primary                           | `processChronicleDocument`                                         |

### OCR classification by module

| Module    | OCR role                        | Can native-text PDF bypass OCR?                                           |
| --------- | ------------------------------- | ------------------------------------------------------------------------- |
| Health    | Primary path (+ AI-direct skip) | **Partially** — AI-direct reads PDF without OCR; no native-text-only path |
| Insurance | Fallback                        | AI-direct first; OCR only on failure                                      |
| Vehicles  | Fallback                        | AI-direct first; heuristics always run                                    |
| Finance   | Fallback                        | AI-direct required; fails without AI                                      |
| Identity  | Primary                         | No AI-direct; OCR always for passport path                                |
| Property  | Unused                          | No import pipeline                                                        |

### Flags

| ID     | Finding                                                                                                 | Severity |
| ------ | ------------------------------------------------------------------------------------------------------- | -------- |
| OCR-01 | No production native PDF text extraction — text-based PDFs still route through OCR when AI-direct fails | P1       |
| OCR-02 | Identity uses OCR-primary without AI-direct shortcut available to other modules                         | P2       |
| OCR-03 | Tesseract referenced nowhere — good; single OCR provider                                                | OK       |

---

## Module Field Source Matrix (Part 10)

Legend: **AI** = Gemini extraction | **OCR** = Document AI text | **Folder** = path heuristic | **Filename** = name heuristic | **Regex** = deterministic pattern | **DB** = default/manual | **Derived** = computed from other fields

### Health (REFERENCE)

| Field                          | Source                       | Evidence                                                         | Presented as factual?   | Real-data validated?              |
| ------------------------------ | ---------------------------- | ---------------------------------------------------------------- | ----------------------- | --------------------------------- |
| Lab metrics (LDL, HbA1c, etc.) | AI + OCR layout + merge      | `metric-extraction.engine.ts`, `health-ai-extraction.service.ts` | Yes, with evidence refs | **YES** (910 metrics, 25 reports) |
| Report date                    | AI + filename parser         | `health-metadata.parser.ts`                                      | Yes                     | YES                               |
| Lab name                       | AI + layout                  | Health processing                                                | Yes                     | Partial                           |
| Report type                    | AI + layout classifiers      | Layout extractors                                                | Yes                     | Partial                           |
| Patient / member               | Folder assignment + registry | Family assignment flow                                           | Yes                     | YES                               |
| Reference ranges               | Layout parser                | OCR table extractors                                             | Yes                     | CODE-REVIEW                       |

**Example (real data):** Latest LDL 95.70 mg/dl, report date 2026-04-23 — reconciled in `real-data-validation.mjs`.

**Pipeline stages:**

| Stage             | Implemented | Used | Fallback             | Failure behavior             |
| ----------------- | ----------- | ---- | -------------------- | ---------------------------- |
| Discovery         | Yes         | Yes  | Manual folder assign | Skip unscored folders        |
| Download          | Yes         | Yes  | —                    | Report marked failed         |
| AI-direct         | Yes         | Yes  | → OCR                | Continue to OCR              |
| OCR               | Yes         | Yes  | —                    | Report failed / needs review |
| Layout extraction | Yes         | Yes  | → AI-only metrics    | Partial metrics              |
| Entity persist    | Yes         | Yes  | —                    | Retry/reprocess available    |
| Knowledge         | Yes         | Yes  | —                    | Ask/search degraded          |

---

### Insurance

| Field                             | Source                                         | Evidence                                | Presented as factual?        | Real-data validated?             |
| --------------------------------- | ---------------------------------------------- | --------------------------------------- | ---------------------------- | -------------------------------- |
| Insurer                           | AI → Filename fallback                         | `inferInsurerFromFileName`              | **Sometimes heuristic**      | YES (9 policies)                 |
| Policy number                     | AI → Heuristic `insurerId:policyType:fileStem` | `insurance-processing.service.ts`       | **Risk: synthetic fallback** | YES                              |
| Policy type                       | AI + folder category hint                      | Folder segments                         | Mixed                        | YES                              |
| Sum insured / coverage            | AI                                             | Domain extraction payload               | Yes when AI succeeds         | Partial                          |
| Expiry date                       | AI                                             | Domain extraction                       | Yes when extracted           | Partial (many "—" in validation) |
| Premium                           | AI                                             | Domain extraction                       | Yes when extracted           | NOT VALIDATED                    |
| Document kind (renew/claim)       | AI + filename keywords                         | Keyword heuristics                      | Mixed                        | CODE-REVIEW                      |
| Category (motor/home/life/health) | Folder path                                    | `insurance-folder-discovery.service.ts` | **Heuristic**                | YES                              |

**Example (real data):** 2 motor policies (IndusInd, Reliance XEV 9E), expiries 2027-03-18 / 2028-03-18. Life/home/health policies show expiry "—" in validation — **expiry extraction incomplete for non-motor**.

**vs Health:** Same download pattern; no layout parsers; heavy deterministic fallback when AI fails.

---

### Vehicles

| Field               | Source                     | Evidence                                 | Presented as factual? | Real-data validated?               |
| ------------------- | -------------------------- | ---------------------------------------- | --------------------- | ---------------------------------- |
| Registration number | Regex + AI override        | `vehicle-document-extraction.service.ts` | Mixed                 | **NO** (0 vehicles in prod)        |
| VIN                 | Regex + AI                 | Field definitions                        | Mixed                 | NO                                 |
| Make / model        | Folder name + AI           | `vehicle-identity.service.ts`            | **Heuristic-first**   | QA ONLY                            |
| Document type       | Filename/folder classifier | `vehicle-document-classifier`            | Heuristic             | QA ONLY                            |
| Service date        | Regex on text              | Field definitions                        | Heuristic             | QA ONLY                            |
| Insurance expiry    | Linked motor policies      | `vehicle-insurance-linkage.service.ts`   | Derived (reference)   | Partial (insurance side validated) |
| Purchase date       | Regex / AI facts           | Merged extraction                        | Mixed                 | NOT VALIDATED                      |

**Example (QA):** XEV 9e synthetic seed — registration, make/model from QA interceptors, not real Drive sync.

**vs Health:** **Inverted priority** — heuristics run always; AI enriches. No OCR layout layer.

**Critical gap:** `vehicle_folder_assignments = 0` in production — pipeline never runs on real data.

---

### Identity

| Field           | Source                  | Evidence                              | Presented as factual? | Real-data validated? |
| --------------- | ----------------------- | ------------------------------------- | --------------------- | -------------------- |
| Document type   | Filename/folder         | `identity-type.registry.ts`           | Heuristic             | NO (0 docs)          |
| Name            | Regex on OCR text       | `document-metadata.engine.ts`         | Heuristic             | NO                   |
| DOB             | Regex / passport parser | Field definitions                     | OCR-dependent         | NO                   |
| Expiry          | Regex / passport parser | Passport parser                       | OCR-dependent         | NO                   |
| Document number | OCR + passport parser   | `runDocumentIntelligencePipeline`     | Yes for passport      | NO                   |
| Owner / member  | Folder path + filename  | `identity-member-resolver.service.ts` | Heuristic             | NO                   |

**Example:** Passport path: OCR → `@chronicle/core-parser` passport parser. Aadhaar/PAN: type from filename, fields from regex — **no AI extraction**.

**vs Health:** Uses shared document-intelligence infrastructure but **without Health AI metric layer**.

---

### Finance

| Field          | Source                     | Evidence                                 | Presented as factual? | Real-data validated? |
| -------------- | -------------------------- | ---------------------------------------- | --------------------- | -------------------- |
| Document type  | Filename/folder classifier | `finance-document-classifier.service.ts` | Heuristic             | NO (0 docs)          |
| Institution    | AI only                    | Domain extraction                        | Yes when AI succeeds  | NO                   |
| Account number | AI only                    | Domain extraction                        | Yes when AI succeeds  | NO                   |
| Balance        | AI only                    | Domain extraction                        | Yes when AI succeeds  | NO                   |
| Statement date | AI only                    | Domain extraction                        | Yes when AI succeeds  | NO                   |
| Display label  | Filename/folder            | Heuristics                               | Heuristic             | NO                   |

**Confidence gate:** Documents with AI confidence < 0.35 marked **failed** — no rich deterministic fallback (unlike Insurance).

**vs Health:** Structured fields are AI-only; classification is pre-extraction heuristic.

---

### Property

| Field                | Source                    | Evidence                              | Presented as factual? | Real-data validated? |
| -------------------- | ------------------------- | ------------------------------------- | --------------------- | -------------------- |
| Property name        | Folder path               | `property-folder-resolver.ts`         | Heuristic             | NO (0 docs)          |
| Property identity    | Folder slug               | `property-entity-resolver.service.ts` | Heuristic             | NO                   |
| Document type        | Filename/subcategory      | `property-type.registry.ts`           | Heuristic             | NO                   |
| Purchase date        | Document metadata columns | No AI                                 | Unknown               | NO                   |
| Value / registration | Not extracted             | —                                     | N/A                   | NO                   |

**vs Health:** **Largest gap** — no `property-import-runner`, no processing service, no sync in Drive sync service.

---

## Health vs Other Modules Comparison (Part 11)

| Capability             | Health        | Insurance     | Vehicles | Identity            | Finance             | Property   |
| ---------------------- | ------------- | ------------- | -------- | ------------------- | ------------------- | ---------- |
| Discovery engine       | Full scoring  | Full          | Full     | Folder filter       | Registry scan       | Setup only |
| Import runner          | Yes           | Yes           | Yes      | Yes                 | Yes                 | **No**     |
| AI-direct extraction   | Yes           | Yes           | Yes      | **No**              | Yes                 | **No**     |
| OCR pipeline           | Yes (primary) | Fallback      | Fallback | Primary             | Fallback            | **No**     |
| Layout parsers         | Yes           | No            | No       | Passport only       | No                  | No         |
| Deterministic fallback | Partial       | Heavy         | Heavy    | Primary             | Minimal             | Only       |
| Module DB tables       | Yes           | Yes           | Yes      | chronicle_documents | chronicle_documents | Derived    |
| Knowledge persist      | DB graph      | Builder+cache | Builder  | In-memory           | Builder             | Builder    |
| Real-data validated    | **YES**       | **YES**       | **NO**   | **NO**              | **NO**              | **NO**     |

---

## Fabrication Risk Paths

| ID     | Path                                                                  | Risk                                        | Severity                      |
| ------ | --------------------------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| FAB-01 | Insurance deterministic policy number `insurerId:policyType:fileStem` | Synthetic policy IDs shown as real          | P0 if displayed without label |
| FAB-02 | Insurance insurer from filename only                                  | Wrong insurer attribution                   | P1                            |
| FAB-03 | Vehicle heuristics without AI confirmation                            | Registration/VIN from regex false positives | P1                            |
| FAB-04 | Ask universal narrative path without evidence                         | Generic answers without grounding           | P1                            |
| FAB-05 | Property folder-name-as-property-identity                             | Invented property facts                     | P1                            |
| FAB-06 | Finance failure → empty vs heuristic gap                              | User sees nothing vs wrong data tradeoff    | P2                            |

---

## Knowledge / Evidence (Part 12)

| Module    | Canonical source                     | Freshness         | Confidence    | Ask uses evidence?            | UI = knowledge?                |
| --------- | ------------------------------------ | ----------------- | ------------- | ----------------------------- | ------------------------------ |
| Health    | `health-knowledge` DB + builder      | Sync-driven       | Metric-level  | Yes (health pipeline)         | Mostly aligned                 |
| Insurance | `insurance-knowledge-builder`        | Sync-driven       | Policy-level  | Yes (universal/companion)     | Mostly aligned                 |
| Vehicles  | `vehicle-knowledge-builder`          | Sync-driven       | Fact-level    | Partial (companion fast path) | **Blocked** — no real entities |
| Identity  | In-memory from `chronicle_documents` | Import-driven     | Low           | Structured only               | Unknown                        |
| Finance   | `finance-knowledge.builder`          | Import-driven     | AI confidence | Structured only               | Unknown                        |
| Property  | `property-knowledge.builder`         | Folder assignment | Heuristic     | Structured only               | Unknown                        |

**Dual Health knowledge stacks:** Search uses `features/health/providers/health-knowledge.provider.ts`; Ask/evidence uses `features/health-knowledge/providers/` — potential drift.

---

## Real-Data vs QA Matrix (Part 20)

| Module    | Production folder assigned | Entities in DB          | Pipeline exercised | Validation status                |
| --------- | -------------------------- | ----------------------- | ------------------ | -------------------------------- |
| Health    | 2 folders                  | 25 reports, 910 metrics | Full               | **PROVEN WITH REAL DATA**        |
| Insurance | 1 folder                   | 9 policies, 10 docs     | Full               | **PROVEN WITH REAL DATA**        |
| Vehicles  | **0**                      | 0 vehicles, 0 docs      | **Not run**        | **NOT VALIDATED** (QA seed only) |
| Identity  | Unknown                    | 0 docs                  | Not run            | **NOT VALIDATED**                |
| Finance   | Unknown                    | 0 docs                  | Not run            | **NOT VALIDATED**                |
| Property  | Unknown                    | 0 docs                  | Not run            | **NOT VALIDATED**                |

---

## Recommended Extraction Architecture (reference — not implemented)

```
Native PDF text read (when available)
  → AI extraction (all modules)
  → OCR only if image-only OR native text insufficient
  → Heuristics labeled as "estimated" not factual
  → Persist with extraction method + confidence on every field
```

Current state diverges: no native text path; heuristics often unlabeled; Property has no pipeline.
