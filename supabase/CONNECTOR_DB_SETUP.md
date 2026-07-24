# Connector database setup

The Google Drive connector requires connector tables in Supabase. If you see:

`Could not find the table public.connector_connections in the schema cache`

the migration has not been applied yet.

## Option A — CLI script (recommended)

1. Open **Supabase Dashboard → Project Settings → Database**
2. Copy your **database password**
3. Add to `.env.local` (do not commit):

```env
SUPABASE_DB_PASSWORD=your-database-password
```

4. Apply the migration:

```bash
pnpm db:connectors
```

The script runs `supabase/migrations/20260728120000_connector_connections_foundation.sql`, then prints the connector tables and RLS policies it finds.

For **family health folders** (M16.1.2 / M16.1.3), also run:

- `supabase/migrations/20260729120000_family_health_folders.sql`
- `supabase/migrations/20260730120000_health_folder_assignments.sql`

These add `family_members`, `family_member_aliases`, and `health_folder_assignments` for multi-folder and shared-folder support.

For **health import pipeline** (M16.2–M16.5), also run:

- `supabase/migrations/20260731120000_health_import_pipeline.sql`

These add discovery categories, approval workflow, and import pipeline columns on `connector_document_registry`.

## Health reports import (required)

Google Drive import inserts rows into `health_reports` with `status: 'uploaded'` and `source: 'google_drive'`. Apply these migrations **before** running import:

| Migration file                                                            | Required for                                                     |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `supabase/migrations/20260722120000_health_reports.sql`                   | Base `health_reports` table + `health-reports` storage bucket    |
| `supabase/migrations/20260723120000_health_report_processing.sql`         | Processing status + queue                                        |
| `supabase/migrations/20260724120000_document_intelligence_pipeline.sql`   | `status IN ('uploaded','completed',...)`                         |
| `supabase/migrations/20260726120000_connector_framework.sql`              | `source`, `external_file_id`, `connector_id` on `health_reports` |
| `supabase/migrations/20260728120000_connector_connections_foundation.sql` | Connector tables                                                 |
| `supabase/migrations/20260729120000_family_health_folders.sql`            | Family members                                                   |
| `supabase/migrations/20260730120000_health_folder_assignments.sql`        | Folder assignments                                               |
| `supabase/migrations/20260731120000_health_import_pipeline.sql`           | Discovery categories, approval                                   |

Also apply:

| `supabase/migrations/20260732120000_health_reports_dedupe_and_bucket_limit.sql` | 50 MB bucket limit + unique `(user_id, external_file_id)` index |

### Verification SQL

Run in **Supabase SQL Editor** after applying migrations:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'health_reports'
  AND column_name IN ('status', 'source', 'external_file_id', 'connector_id');

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.health_reports'::regclass
  AND contype = 'c';
-- Must allow status 'uploaded' and 'completed'
```

If import fails with a schema/constraint error, re-run the migrations above and reload the schema:

```sql
NOTIFY pgrst, 'reload schema';
```

### Edge function deploy (after OAuth/download changes)

```bash
npx supabase functions deploy drive-connector --project-ref mqmznhyndzqtieaxaiyu
npx supabase functions deploy document-ocr --project-ref mqmznhyndzqtieaxaiyu
```

`drive-connector` supports `connect`, `browse`, `discover`, `download`, and `disconnect` actions.

`document-ocr` requires Google Document AI secrets. Without them the function returns **503** and report processing **fails** (no fake metrics). Deploy and configure secrets, then **Reprocess all reports** from Health → Reports or Import Center.

Required edge function secrets:

| Secret                            | Purpose                                |
| --------------------------------- | -------------------------------------- |
| `GOOGLE_DOCUMENT_AI_PROJECT_ID`   | GCP project                            |
| `GOOGLE_DOCUMENT_AI_PROCESSOR_ID` | Document AI processor                  |
| `GOOGLE_DOCUMENT_AI_LOCATION`     | Region (default `us`)                  |
| `GOOGLE_DOCUMENT_AI_ACCESS_TOKEN` | OAuth access token for Document AI API |

If uploads fail with _exceeded the maximum allowed size_, raise the `health-reports` bucket limit in Supabase Dashboard (**Storage → health-reports → Settings**) or apply `20260732120000_health_reports_dedupe_and_bucket_limit.sql` (50 MB).

Requires secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (must match Supabase Google provider).

## Option B — SQL Editor

1. Open **Supabase Dashboard → SQL Editor → New query**
2. Paste the contents of:

`supabase/migrations/20260728120000_connector_connections_foundation.sql`

3. Click **Run**

## What gets created

| Table                         | Purpose                                   | Client RLS                  |
| ----------------------------- | ----------------------------------------- | --------------------------- |
| `connector_connections`       | Connection status, email, timestamps      | Yes — users manage own rows |
| `connector_oauth_tokens`      | Refresh tokens (server-side only)         | No client policies          |
| `connector_folders`           | Selected Drive folders                    | Yes                         |
| `connector_document_registry` | Discovered files                          | Yes                         |
| `connector_import_queue`      | Import jobs                               | Yes                         |
| `connector_sync_runs`         | Sync history                              | Yes                         |
| `family_members`              | Family members for health folder mapping  | Yes                         |
| `family_member_aliases`       | Alternate names for smart folder matching | Yes                         |
| `health_folder_assignments`   | Many-to-many folder ↔ member assignments  | Yes                         |

## RLS verification

After applying, authenticated users can **SELECT / INSERT / UPDATE / DELETE** only rows where `auth.uid() = user_id` on all connector tables except `connector_oauth_tokens`.

`connector_oauth_tokens` has RLS enabled with **no policies**, so only the service role (edge functions) can access tokens.

## Post-migration

1. Reload the Google Drive page — status should show **Not connected** with no database errors
2. Click **Connect Google Drive** — OAuth should launch
3. After OAuth, connection metadata is stored in `connector_connections`

## Troubleshooting

- **Schema cache error persists after running SQL:** Wait ~30 seconds or run `NOTIFY pgrst, 'reload schema';` (included at end of migration)
- **Connect works but finalize fails:** Ensure `connector_oauth_tokens` was created and the `drive-connector` edge function is deployed
- **Permission denied on connector_connections:** Confirm you are signed in and RLS policies were created
