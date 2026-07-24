# Health Import Workflow

Chronicle's end-to-end Health Import experience brings real health reports from Google Drive into the Health Knowledge Graph with a guided wizard, live progress, and automatic dashboard updates.

## Flow

```
Sync Health Reports
  ↓
Google Drive Connector (configured folders)
  ↓
Discovery (PDFs + metadata + duplicate check)
  ↓
Document Registry
  ↓
Import Queue (parallel downloads)
  ↓
Existing Document Pipeline (OCR → Parser → Metrics)
  ↓
Health Knowledge Graph
  ↓
Health Dashboard + Ask Chronicle
```

## First Import Wizard

Route: `/health/import/wizard`

| Step         | Screen                                                 |
| ------------ | ------------------------------------------------------ |
| 1 Welcome    | Explains folder scan and automatic processing          |
| 2 Discovery  | Folders, PDF count, skipped duplicates, estimated time |
| 3 Import     | Starts import job                                      |
| 4 Processing | Live per-document pipeline stages                      |
| 5 Completion | Import summary with metrics, years, categories         |

Launch from **Google Drive → Sync Health Reports**.

## Import Center

Route: `/health/import`

- Current import progress
- Completed / failed imports
- Retry queue
- Document registry buckets (imported, skipped, failed, processing, queued)
- Import history with duration and counts

## Duplicate Detection

Duplicates are skipped using:

- Google Drive File ID
- Checksum fingerprint (`fileId:modifiedAt:size`)
- File size + modified date

Skipped records use `import_status: skipped` in the document registry.

## Pipeline stages

Each document progresses through:

1. Downloading
2. Imported (stored in `health-reports` bucket)
3. OCR
4. Parsing
5. Knowledge Graph
6. Completed

Failed documents remain in registry with error messages (corrupt PDF, password-protected, permission errors, network failures).

## Dashboard integration

- `useUploadedHealthReports` polls while processing is pending
- Import service invalidates React Query cache on each document completion
- Health Knowledge Graph cache is invalidated after each successful report
- Health Dashboard shows import notifications without page refresh

## Notifications

In-app notifications for:

- Import started
- Import complete
- Import failed
- Retry complete

## Developer mode

Route: `/health/import/debug` (dev only)

Shows import queue, processing times, and failures.

## Key files

```
src/features/health-import/
  services/health-import.service.ts      # Wizard orchestration
  services/health-import-runner.service.ts # Sync + parallel import
  services/duplicate-detection.service.ts
  services/import-summary.service.ts
  services/import-history.service.ts
  components/HealthImportWizard.tsx
  components/ImportCenter.tsx
  hooks/useHealthImport.ts
```

## Error recovery

- **Retry Failed** re-queues failed registry records
- **Cancel Import** stops active job
- Partial imports are recorded in sync history as `partial`
- Password-protected and corrupt PDFs fail gracefully with persisted errors

See also: [CONNECTOR_FRAMEWORK.md](./CONNECTOR_FRAMEWORK.md), [HEALTH_KNOWLEDGE_GRAPH.md](./HEALTH_KNOWLEDGE_GRAPH.md)
