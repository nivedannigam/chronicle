# Supabase Storage: `health-reports` bucket

Run the SQL migration first (`supabase/migrations/20260722120000_health_reports.sql`), or configure manually in the Supabase Dashboard.

## Option A — SQL migration (recommended)

1. Open **Supabase Dashboard → SQL Editor**
2. Paste and run the migration file
3. Confirm the bucket appears under **Storage → Buckets**

## Option B — Manual dashboard setup

### 1. Create the bucket

1. Go to **Storage → New bucket**
2. **Name:** `health-reports`
3. **Public bucket:** Off (private)
4. **File size limit:** 10 MB
5. **Allowed MIME types:** `application/pdf`

### 2. Storage policies

Add policies on `storage.objects` for bucket `health-reports`:

| Policy           | Operation | Target roles  | Expression                                                                          |
| ---------------- | --------- | ------------- | ----------------------------------------------------------------------------------- |
| Upload own files | INSERT    | authenticated | `bucket_id = 'health-reports' AND auth.uid()::text = (storage.foldername(name))[1]` |
| Read own files   | SELECT    | authenticated | Same as above                                                                       |
| Delete own files | DELETE    | authenticated | Same as above                                                                       |

Files are stored under `{user_id}/{report_id}_{filename}.pdf`.

### 3. Verify

1. Sign in to Chronicle
2. Open **More → Health**
3. Click **Upload Report** and select a PDF
4. Confirm the file appears in **Storage → health-reports → {your-user-id}**
5. Confirm a row appears in **Table Editor → health_reports**

## Troubleshooting

- **Upload failed / new row violation:** Ensure RLS policies are applied and the user is authenticated.
- **403 on storage:** Check that the storage path starts with the signed-in user's UUID.
- **MIME type rejected:** Only PDF files are allowed.
