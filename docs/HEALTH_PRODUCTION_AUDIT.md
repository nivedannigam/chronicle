# Health Module — Production Audit

**Date:** July 2026  
**Scope:** Health UI, data pipeline, Supabase, mock removal  
**Goal:** One source of truth; every screen renders production data.

---

## Executive Summary

The Health module now uses a **single read pipeline** for all screens:

```
Supabase health_reports
  → useUploadedHealthReports / useMemberHealthReports (member filter)
  → getParsedHealthReport (parsed_data JSONB normalization)
  → buildHealthKnowledgeGraph (in-memory, mockReports: [])
  → buildHealthCompanionView (+ trendSeries from metric histories)
  → Overview | Reports | Timeline | Metrics | Insights | Detail | Ask
```

Mock fixtures (`mockHealth.ts`, `health.service.ts`) remain **only** for mock Ask Chronicle in development. They are not used by Health UI routes.

---

## Architecture — Single Source of Truth

| Layer | File                              | Role                                                         |
| ----- | --------------------------------- | ------------------------------------------------------------ |
| Fetch | `useMemberHealthReports.ts`       | Supabase query + family member filter                        |
| Parse | `health-parsed-report.service.ts` | Normalizes `parsed_data`; legacy `metricResults` → `metrics` |
| Graph | `health-knowledge-builder.ts`     | Observations → histories → categories → insights             |
| View  | `health-companion.service.ts`     | Screen-specific slices (attention, changes, journey, groups) |
| Hook  | `useHealthCompanion.ts`           | Wires graph + proactive insights + trends                    |

All Health pages call `useHealthCompanion()` (or `useHealthReportDetail` for detail).

---

## Issues Found & Root Causes

### 1. Blank Metrics page

**Symptom:** Metrics tab empty despite imported reports.

**Root causes (any one blocks the screen):**

1. `parsed_data.metrics[]` empty — OCR/extraction did not produce structured numbers
2. Reports still in `uploaded|queued|processing|parsed` — not yet `completed`
3. Member filter hides reports (`family_member_id` mismatch)
4. Legacy shape: metrics stored under `metricResults` only (fixed in `parseStoredHealthReport`)

**Fixes applied:**

- Robust `parseStoredHealthReport` with `metricResults` fallback
- Metrics page empty states distinguish processing / failed / no extraction
- Trend charts restored on Metrics via `companion.trendSeries`

### 2. Empty Insights (“no measures”)

**Symptom:** Insights empty though reports exist.

**Root cause:** Same as Metrics — `metricHistories` empty when `parsed_data.metrics` is empty. Proactive insights engine also requires completed reports with numeric observations.

**Fix:** Pipeline normalization (above). Insights page already uses `companion.insightGroups` from the same graph.

### 3. Report detail placeholders (John Doe)

**Audit result:** Report detail (`HealthReportDetailPage`) reads `parsed.metadata` and uploaded row fields. **No hardcoded patient names in UI.**

`John Doe` appears only in:

- `mock-ocr.templates.ts` (dev OCR fallback)
- Unit tests

If John Doe appears in UI, the **uploaded PDF used mock OCR** — reprocess with production OCR provider.

### 4. Duplicate Health content

| Removed                                      | Kept                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| Overview “Explore” grid (duplicated tab nav) | Overview score, attention, changes, latest report teaser, trend highlights |
| —                                            | Reports tab = full report list                                             |
| —                                            | Timeline tab = journey events (checkups/findings), not upload log          |

### 5. Duplicate profile icon

**Audit result:** Profile entry exists only in `FigmaBottomNav`. Health header has search only. Home links to Family, not a duplicate avatar.

### 6. Floating navigation

**Status:** Already implemented in `FigmaBottomNav.tsx` — glass, rounded, shadow, safe-area, fixed bottom.

### 7. Health Setup blank page

**Root cause:** `HealthSettingsPage` returned `null` when no `selectedMember`.

**Fix:** Empty states for unsigned-in and no family member selected.

### 8. Disconnected trend graphs

**Root cause:** `trendSeries` computed in knowledge service but not rendered in new Figma Metrics view.

**Fix:** `FigmaHealthTrendChart` + Metrics section “Trends over time” (requires 2+ numeric readings per metric).

---

## Data Pipeline Stages

```
Upload (manual / Google Drive import)
  ↓ health-upload.service / health-import-runner
OCR (Azure / Google / mock in dev)
  ↓ health-processing.service
Extraction (metric-extraction.engine)
  ↓ parsed_data JSONB on health_reports
Normalization (parseStoredHealthReport)
  ↓
Knowledge graph (buildHealthKnowledgeGraph)
  ↓
Screens (useHealthCompanion)
```

**Break points to check in Supabase:**

```sql
SELECT status, COUNT(*) FROM health_reports GROUP BY status;
SELECT COUNT(*) FROM health_reports
  WHERE status = 'completed'
    AND jsonb_array_length(COALESCE(parsed_data->'metrics', '[]'::jsonb)) > 0;
```

---

## Database Tables

| Table                            | Purpose                                        |
| -------------------------------- | ---------------------------------------------- |
| `health_reports`                 | Source of truth: file metadata + `parsed_data` |
| `health_report_processing_queue` | Async OCR queue                                |
| `health_folder_assignments`      | Drive folder → family member                   |
| `health_knowledge_graphs`        | Optional persist cache (UI builds in-memory)   |
| `family_members`                 | Member filter for reports                      |

No separate `metrics` or `measurements` tables — metrics live inside `parsed_data`.

---

## Mock / Demo Inventory

| Location                                    | Status                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `mockHealth.ts`                             | Kept for mock Ask only; `@deprecated` on `health.service.ts`            |
| `health-knowledge-builder` mockReports path | Production passes `mockReports: []`                                     |
| `mock-ocr.templates.ts`                     | Dev/test only                                                           |
| `useHealthReport.ts`                        | Rewritten to production; deprecated in favor of `useHealthReportDetail` |

---

## Cleanup

Run `scripts/health-demo-cleanup.sql` after reviewing counts. Removes mock-OCR rows with no metrics and duplicate Drive imports. Does not drop tables or PDFs.

---

## Duplicate Detection (Scan + Upload)

| Stage             | Behavior                                                                            |
| ----------------- | ----------------------------------------------------------------------------------- |
| **Drive scan**    | `checkDiscoveryDuplicate` skips unchanged/completed files; marks registry `skipped` |
| **Import queue**  | `checkForDuplicate` skips before download                                           |
| **Import load**   | Skips re-download/OCR if `health_reports.status = completed`                        |
| **Manual upload** | SHA-256 `file_hash` dedupe per user + family member                                 |
| **Database**      | Unique `(user_id, external_file_id)` on Drive imports                               |

Migration: `20260735120000_health_reports_file_hash.sql`

---

After cleanup, re-upload one known lab PDF and verify:

- [ ] OCR completes (`status = completed`)
- [ ] `parsed_data.metrics` has entries in Supabase
- [ ] Overview score and attention populate
- [ ] Reports list shows real title/lab/date
- [ ] Timeline shows journey events
- [ ] Metrics shows groups + trend charts (if 2+ readings)
- [ ] Insights shows groups
- [ ] Report detail shows real patient/lab/metrics (no placeholders)
- [ ] Ask can reference report metrics

---

## Screen QA Matrix

| Screen   | Data source                              | Production-ready            |
| -------- | ---------------------------------------- | --------------------------- |
| Overview | `useHealthCompanion`                     | Yes                         |
| Reports  | `buildReportSummaries(reports)`          | Yes                         |
| Timeline | `companion.journeyEvents`                | Yes                         |
| Metrics  | `companion.metricGroups` + `trendSeries` | Yes (with pipeline caveats) |
| Insights | `companion.insightGroups`                | Yes                         |
| Setup    | Family + Drive + import services         | Yes                         |
| Detail   | `useHealthReportDetail`                  | Yes                         |
| Search   | Global search index                      | Yes                         |
| Ask      | Production or mock engine (config)       | Config-dependent            |

---

## Remaining Constraints (Not Bugs)

1. **Trend charts** need 2+ numeric observations per metric across reports.
2. **Member switching** requires reports tagged with correct `family_member_id`.
3. **Mock OCR reports** should be reprocessed or removed (see cleanup SQL).
4. **Ask mock mode** still uses `health.service.ts` demo data when AI provider is mock.

---

## Files Changed in This Sprint

- `health-parsed-report.service.ts` — normalization
- `health-knowledge-builder.ts` — safe metrics access, display titles
- `useHealthReport.ts` — production rewrite
- `useHealthCompanion.ts` — trendSeries wiring
- `health-companion.service.ts` / types — trendSeries on view
- `HealthMetricsPage.tsx` — pipeline-aware empty states
- `HealthSettingsPage.tsx` — empty states
- `figma-health-views.tsx` — remove Explore duplicate, trends on Metrics
- `figma-health-primitives.tsx` — `FigmaHealthTrendChart`
- `health.service.ts` — deprecation notice

---

## Conclusion

Health is **production-ready for daily use** when reports complete OCR with extracted metrics. Empty Metrics/Insights states now explain _why_ data is missing instead of silently failing. One pipeline feeds all screens; mock data is isolated to dev Ask fixtures.
