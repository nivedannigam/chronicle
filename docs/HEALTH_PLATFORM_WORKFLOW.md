# Chronicle Health Platform — Workflow Engine Architecture

**Sprint:** Platform Stabilization  
**Status:** Reference implementation for Chronicle modules  
**SSOT:** `health_workflow_items` + `health_workflow_events`

---

## 1. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CHRONICLE PLATFORM                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              src/core/workflow/  (GENERIC ENGINE)                 │  │
│  │  workflow.types.ts    — states, transitions, events               │  │
│  │  workflow-events.ts   — pub/sub event bus                         │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                       │
│  ┌───────────────────────────────▼───────────────────────────────────┐  │
│  │         src/features/health/workflow/  (HEALTH ADAPTER)           │  │
│  │  health-workflow.service.ts      — persist + transition + sync    │  │
│  │  health-workflow-projections.ts  — single read model for UI       │  │
│  │  health-workflow-bootstrap.ts    — register event handlers        │  │
│  └───────────────────────────────┬───────────────────────────────────┘  │
│                                  │                                       │
│         ┌────────────────────────┼────────────────────────┐             │
│         ▼                        ▼                        ▼             │
│   Discovery              Import / OCR              Review / Approve     │
│   medical-discovery      health-import-runner      import-review        │
│                          health-processing        import-pipeline     │
│         │                        │                        │             │
│         └────────────────────────┼────────────────────────┘             │
│                                  ▼                                       │
│              health_workflow_items  (AUTHORITATIVE STATE)                │
│              health_workflow_events (AUDIT + SIDE EFFECTS)               │
│                                  │                                       │
│         ┌────────────────────────┼────────────────────────┐             │
│         ▼                        ▼                        ▼             │
│   health_reports          React Query cache         In-memory graph      │
│   (parsed_data)           (reports, workflow)       (metrics/insights)   │
│         │                        │                        │             │
│         └────────────────────────┼────────────────────────┘             │
│                                  ▼                                       │
│   Dashboard │ Reports │ Timeline │ Insights │ Metrics │ AI │ Search     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Future modules** (Documents, Finance, Insurance) reuse `src/core/workflow/` with domain-specific adapters.

---

## 2. State Machine

```
DISCOVERED ──► PENDING_REVIEW ──► APPROVED ──► QUEUED ──► IMPORTING
                    │                              │
                    ▼                              ▼
                REJECTED                      PROCESSING
                                                    │
                    ┌───────────────────────────────┤
                    ▼                               ▼
              OCR_COMPLETE ──► PARSED ──► READY   FAILED
                                              │       │
                                              │       └──► (retry) ──► QUEUED
                                              ▼
                                         SKIPPED (terminal)
```

| State                  | Meaning                                   | UI surfaces              |
| ---------------------- | ----------------------------------------- | ------------------------ |
| `DISCOVERED`           | Scanned, likely medical, not yet reviewed | Review (optional)        |
| `PENDING_REVIEW`       | Needs human approval                      | Review queue, badges     |
| `APPROVED`             | Approved, awaiting import                 | Review "ready to import" |
| `QUEUED`               | In import queue                           | Processing indicators    |
| `IMPORTING`            | Downloading from Drive                    | Setup progress           |
| `PROCESSING`           | OCR running                               | Report status            |
| `OCR_COMPLETE`         | Text extracted                            | Internal                 |
| `PARSED`               | Metrics extracted to parsed_data          | Metrics prep             |
| `READY`                | Complete — dashboard eligible             | All production views     |
| `FAILED`               | Error — retry available                   | Review retry             |
| `SKIPPED` / `REJECTED` | Terminal — excluded                       | Hidden                   |

---

## 3. Database Changes

### New tables (migration `20260736120000_health_workflow_engine.sql`)

- **`health_workflow_items`** — one row per registry document lifecycle
- **`health_workflow_events`** — append-only transition log

### Legacy tables (synced on transition, not authoritative)

- `connector_document_registry` — import_status, approval_status synced FROM workflow
- `health_reports` — status synced during processing
- `health_report_processing_queue` — upsert on retry (no duplicate rows)

### No `health_metrics` table

Metrics remain in `health_reports.parsed_data` JSONB. Graph built in-memory from completed `READY` workflow items' linked reports.

---

## 4. Event-Driven Side Effects

On every transition, `publishWorkflowEvent` fires:

| Event               | Side effects                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `workflow.ready`    | Invalidate reports, dashboard, workflow projection, knowledge cache |
| `workflow.approved` | Invalidate review + import status                                   |
| `workflow.failed`   | Invalidate review + dashboard                                       |
| `workflow.*`        | Persisted to `health_workflow_events`                               |

**No manual refresh required** — all React Query keys invalidated via `invalidateAfterHealthImport`.

---

## 5. Single Read Model

All UI counts derive from `getHealthWorkflowProjection(userId)`:

- `pendingReviewCount` → Setup guide, Reports banner
- `readyCount` → Import success
- `actionableReviewItems` → Review queue filter

Fallback to legacy registry counts if workflow tables not migrated yet.

---

## 6. Root Causes Fixed

| Symptom                          | Root cause                             | Fix                                             |
| -------------------------------- | -------------------------------------- | ----------------------------------------------- |
| Waiting for review after approve | Category-based count; approve ≠ import | Workflow SSOT + approve-and-import              |
| Dashboard stale                  | Partial cache invalidation             | Event-driven full invalidation                  |
| Duplicate queue key              | INSERT on retry                        | Upsert on report_id                             |
| Screens disagree                 | 3 status fields, no orchestrator       | Workflow engine + legacy sync                   |
| Metrics empty                    | Reports not READY / empty parsed_data  | Workflow gates + production OCR path            |
| Insights "12 months"             | Empty metricHistories OR old dates     | Fixed when reports reach READY with parsed_data |

---

## 7. Mock Data Policy

| Location            | Status                                                   |
| ------------------- | -------------------------------------------------------- |
| `mockHealth.ts`     | Ask/demo only — NOT used by Health routes                |
| `health.service.ts` | Deprecated re-export                                     |
| Health UI routes    | Production data only via `health_reports`                |
| OCR mock templates  | Dev fallback only — flagged by `hasLegacyApproximateOcr` |

---

## 8. QA Checklist (one report)

1. Assign folder → scan → workflow item `DISCOVERED` or `PENDING_REVIEW`
2. Approve → transitions `APPROVED` → `QUEUED` → `IMPORTING` → `PROCESSING` → `READY`
3. Review queue clears item (not in actionable states)
4. Dashboard shows report without refresh
5. Metrics show extracted values from `parsed_data`
6. Insights generated from metric histories
7. Timeline events from completed reports
8. Retry on failed report reuses queue row (no duplicate key)

---

## 9. Files Modified

### Core platform

- `src/core/workflow/workflow.types.ts`
- `src/core/workflow/workflow-events.ts`
- `src/core/workflow/index.ts`

### Health adapter

- `src/features/health/workflow/*`

### Pipeline integration

- `medical-discovery-engine.service.ts`
- `import-pipeline.service.ts`
- `import-review.service.ts`
- `health-import-runner.service.ts`
- `health-processing.service.ts`
- `health-import-status.service.ts`

### Infrastructure

- `src/app/providers.tsx` (bootstrap)
- `src/lib/query-keys.ts`
- `src/lib/query-invalidation.ts`
- `supabase/migrations/20260736120000_health_workflow_engine.sql`
- `scripts/health-workflow-cleanup.sql`

---

## 10. Production Readiness

Health is production-ready when:

- [x] Workflow migration applied
- [x] Single SSOT for report lifecycle state
- [x] Event-driven cache invalidation
- [x] Queue upsert (no duplicate keys)
- [x] Approve triggers full import pipeline
- [x] All Health screens read from same report + workflow projection
- [ ] Apply migration to production Supabase
- [ ] Re-import or reprocess legacy mock-OCR reports with empty metrics
