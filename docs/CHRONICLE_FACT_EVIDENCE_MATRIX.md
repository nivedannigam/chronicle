# Chronicle Fact & Evidence Matrix

Field-level audit — Gate 1 closeout. Status per important factual field:

- **COMPLETE** — AI/metadata extraction + evidence resolver + provenance/confidence + source document
- **PARTIAL** — some layers present; inferred or missing for some paths
- **MISSING** — no reliable extraction or evidence chain

Do not present **MISSING** or low-confidence **INFERRED** fields as confirmed facts in Ask or consumer UI.

---

## Health

| Field                          | Extraction             | Evidence                 | Provenance                   | Confidence | Source doc     | Status       |
| ------------------------------ | ---------------------- | ------------------------ | ---------------------------- | ---------- | -------------- | ------------ |
| Lab metrics (LDL, HbA1c, etc.) | AI-direct + OCR/layout | Health evidence resolver | AI_EXTRACTED / deterministic | Per-metric | health_reports | **COMPLETE** |
| Report date                    | Parser + AI            | Metric/report refs       | AI_EXTRACTED                 | Yes        | health_reports | **COMPLETE** |
| Patient name                   | OCR/metadata           | Limited                  | INFERRED                     | Low        | health_reports | **PARTIAL**  |
| Report type                    | Parser + AI            | Knowledge graph          | AI_EXTRACTED                 | Medium     | health_reports | **COMPLETE** |

---

## Insurance

| Field           | Extraction               | Evidence            | Provenance                       | Confidence | Source doc          | Status                          |
| --------------- | ------------------------ | ------------------- | -------------------------------- | ---------- | ------------------- | ------------------------------- |
| Policy number   | AI / fallback key        | Insurance evidence  | AI_EXTRACTED / INFERRED (Gate 0) | Yes        | insurance_documents | **PARTIAL**                     |
| Insurer         | AI / filename            | Insurance evidence  | AI_EXTRACTED / INFERRED          | Yes        | insurance_documents | **PARTIAL**                     |
| Policy type     | AI + precedence resolver | Category mapping    | AI_EXTRACTED / INFERRED          | Yes        | insurance_policies  | **PARTIAL**                     |
| Expiry date     | AI                       | Timeline + evidence | AI_EXTRACTED                     | Yes        | insurance_policies  | **COMPLETE** (when AI succeeds) |
| Sum insured     | AI                       | Insurance evidence  | AI_EXTRACTED                     | Yes        | insurance_policies  | **PARTIAL**                     |
| Insured members | AI                       | Limited             | AI_EXTRACTED                     | Medium     | parsed_data         | **PARTIAL**                     |

Fallback policy numbers (`{insurer}:{type}:{stem}`) are **INFERRED** — consumer display shows needs review (Gate 0).

---

## Vehicles

| Field                          | Extraction                   | Evidence         | Provenance              | Confidence | Source doc        | Status                                       |
| ------------------------------ | ---------------------------- | ---------------- | ----------------------- | ---------- | ----------------- | -------------------------------------------- |
| Registration                   | AI / regex                   | Vehicle evidence | AI_EXTRACTED / INFERRED | Yes        | vehicle_facts     | **PARTIAL** (0 prod entities)                |
| VIN                            | AI / regex                   | Vehicle evidence | AI_EXTRACTED            | Yes        | vehicle_facts     | **PARTIAL**                                  |
| Make/model                     | AI / folder                  | Vehicle evidence | AI_EXTRACTED / INFERRED | Medium     | vehicle_facts     | **PARTIAL**                                  |
| Insurance expiry (vehicle doc) | AI                           | Vehicle timeline | AI_EXTRACTED            | Yes        | vehicle documents | **PARTIAL**                                  |
| Vehicle entity                 | Folder/doc identity contract | N/A              | USER/folder             | N/A        | assignments       | **PARTIAL** — not from motor insurance alone |

---

## Identity

| Field           | Extraction            | Evidence                   | Provenance            | Confidence | Source doc          | Status      |
| --------------- | --------------------- | -------------------------- | --------------------- | ---------- | ------------------- | ----------- |
| Document type   | Filename/folder       | Identity evidence          | INFERRED              | Low        | chronicle_documents | **PARTIAL** |
| Passport number | Passport parser (OCR) | Identity evidence (masked) | AI_EXTRACTED (parser) | Medium     | chronicle_documents | **PARTIAL** |
| Name / DOB      | Parser / metadata     | Identity evidence          | INFERRED              | Low        | chronicle_documents | **PARTIAL** |
| Expiry          | Parser                | Identity evidence          | AI_EXTRACTED          | Medium     | chronicle_documents | **PARTIAL** |

No domain AI structured extraction.

---

## Finance

| Field              | Extraction                 | Evidence         | Provenance              | Confidence | Source doc              | Status      |
| ------------------ | -------------------------- | ---------------- | ----------------------- | ---------- | ----------------------- | ----------- |
| Account identifier | AI (when succeeds)         | Finance evidence | AI_EXTRACTED            | Yes        | extracted_metadata      | **PARTIAL** |
| Balance / closing  | AI                         | Finance evidence | AI_EXTRACTED            | Yes        | financeExtraction facts | **PARTIAL** |
| Loan amount / EMI  | AI                         | Finance evidence | AI_EXTRACTED            | Yes        | financeExtraction       | **PARTIAL** |
| Document type      | Classifier + AI precedence | Finance evidence | INFERRED / AI_EXTRACTED | Medium     | chronicle_documents     | **PARTIAL** |
| Institution        | AI                         | Finance evidence | AI_EXTRACTED            | Medium     | financeExtraction       | **PARTIAL** |

0 production documents validated.

---

## Property

| Field               | Extraction            | Evidence          | Provenance | Confidence | Source doc          | Status      |
| ------------------- | --------------------- | ----------------- | ---------- | ---------- | ------------------- | ----------- |
| Property identity   | Filename/folder/title | Property evidence | INFERRED   | Low        | chronicle_documents | **MISSING** |
| Purchase date       | Metadata heuristics   | Property evidence | INFERRED   | Low        | knowledge only      | **MISSING** |
| Registration / loan | None                  | Property evidence | INFERRED   | Low        | metadata            | **MISSING** |

No import pipeline, OCR, or AI extraction.

---

## Cross-cutting rules (Gate 0 + Gate 1)

| Rule                                                   | Enforced                                    |
| ------------------------------------------------------ | ------------------------------------------- |
| Ask refuses without evidence                           | Universal Ask — **YES**                     |
| Inferred policy numbers hidden                         | Insurance display — **YES**                 |
| Deterministic fallback → NEEDS_REVIEW                  | Domain orchestrator observability — **YES** |
| Private docs excluded from unauthorized Search/Library | QA tests — **YES** (QA harness)             |
