# Chronicle Connector Framework

Chronicle connectors import external data into domain pipelines through a shared, pluggable framework. Google Drive is the first implementation; future connectors (Gmail, Photos, Calendar, OneDrive, Dropbox, Apple Health, Fitbit, Garmin) implement the same interface.

## Architecture

```
User
  ↓
ConnectorManager
  ↓
Connector (GoogleDriveConnector)
  ↓
Discovery Service
  ↓
Document Registry
  ↓
Import Queue
  ↓
Document Pipeline (OCR → Parser → Metrics)
  ↓
Health Knowledge Graph
  ↓
Ask Chronicle
```

## Core framework

Location: `src/core/connectors/`

| File                   | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `Connector.ts`         | Interface: connect, disconnect, refresh, discover, sync, healthCheck |
| `ConnectorManager.ts`  | Orchestrates all registered connectors                               |
| `ConnectorRegistry.ts` | Registers connector implementations                                  |
| `ConnectorTypes.ts`    | Shared types for folders, registry, queue, sync runs                 |
| `ConnectorStatus.ts`   | Status helpers and labels                                            |

### Connector interface

```typescript
interface Connector {
	readonly id: ConnectorId
	readonly name: string
	connect(context): Promise<void>
	disconnect(context): Promise<void>
	refresh(context): Promise<void>
	discover(context): Promise<ConnectorDiscoveryResult>
	sync(context, mode?): Promise<void>
	healthCheck(context): Promise<ConnectorHealthCheck>
}
```

## Google Drive connector

Location: `src/features/connectors/google-drive/`

### Authentication (incremental OAuth)

- Sign-in uses default Google scopes only
- Drive scope (`drive.readonly`) is requested when the user taps **Connect Google Drive**
- After OAuth, the client sends provider tokens once to the `drive-connector` edge function
- Refresh tokens are stored in `connector_oauth_tokens` (service-role only; no client RLS access)
- Connection metadata (`googleEmail`, `connected_at`) is stored in `connector_connections`
- On app restart, the client calls `verify` to refresh access tokens and confirm Drive access

#### Setup checklist

1. **Google Cloud Console**
   - Enable Google Drive API
   - OAuth consent screen: add scope `https://www.googleapis.com/auth/drive.readonly`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. **Supabase Dashboard → Authentication → Providers → Google**
   - Client ID + Client Secret from Google Cloud
3. **Supabase Edge Function secrets** (for token refresh after restart)
   - `GOOGLE_CLIENT_ID` — same OAuth client as above
   - `GOOGLE_CLIENT_SECRET` — same OAuth client as above
4. **Apply migrations**
   - `20260726120000_connector_framework.sql`
   - `20260727120000_connector_oauth_tokens.sql`
5. **Deploy edge function**
   - `supabase functions deploy drive-connector`

### Folder selection

- Browse Drive folders via folder picker UI
- Select multiple folders with custom aliases
- Enable/disable folders without removing configuration
- Folder IDs persisted in `connector_folders`

### Discovery engine

For each enabled folder, discovers:

- PDF files (images planned)
- Metadata: created, modified, size, Drive file ID
- Checksum fingerprint: `{fileId}:{modifiedAt}:{size}`

### Document registry

Table: `connector_document_registry`

Tracks Drive file ID, checksum, import status, health report link, knowledge graph status. Duplicate imports are skipped when checksum matches a completed record.

### Import queue

States: `discovered → queued → downloading → imported → ocr → parsing → knowledge_graph → completed | failed | retry`

Imported documents automatically flow into the existing health report pipeline.

### Sync engine

- **Initial sync** — discover all files in configured folders
- **Incremental sync** — skip unchanged checksums
- **Manual sync** — user-triggered from dashboard
- **Auto sync** — architecture ready; UI shows manual for now

### Sync dashboard

Route: `/connectors/google-drive`

Displays connection status, folders, imported/pending/failed counts, last sync, retry failed.

### Developer mode

Route: `/connectors/debug` (dev only)

Shows API call log, registry records, queue status.

## Database schema

Migrations:

- `supabase/migrations/20260728120000_connector_connections_foundation.sql` — **apply this** for connector tables + RLS
- `supabase/migrations/20260726120000_connector_framework.sql` — older combined migration (requires `health_reports`)
- `supabase/migrations/20260727120000_connector_oauth_tokens.sql` — included in foundation migration

Setup guide: `supabase/CONNECTOR_DB_SETUP.md`

Apply locally:

```bash
# Add SUPABASE_DB_PASSWORD to .env.local first
pnpm db:connectors
```

Tables:

- `connector_connections`
- `connector_folders`
- `connector_document_registry`
- `connector_import_queue`
- `connector_sync_runs`

Extended `health_reports` with `source`, `external_file_id`, `connector_id`.

## Edge function

`supabase/functions/drive-connector/index.ts`

Actions: `browse`, `discover`, `download`, `disconnect`

Uses mock Drive data when real Google API credentials are not configured (same pattern as document OCR).

## Adding a new connector

1. Implement `Connector` interface
2. Add discovery + sync services under `src/features/connectors/{name}/`
3. Register in `connector-bootstrap.ts`
4. Add migration rows if connector-specific metadata is needed
5. Reuse document registry and import queue tables with a new `connector_id`

No architectural changes required.

## Security

- Store folder IDs, file IDs, sync metadata only
- OAuth tokens handled server-side via edge functions
- RLS on all connector tables (user owns their data)
- Never expose tokens to UI

## Health integration

```
Drive PDF → download → health-reports bucket → health_reports (source: google_drive)
  → OCR → parser → metric extraction → knowledge graph → dashboard + Ask
```

No manual intervention required after folder configuration and sync.
