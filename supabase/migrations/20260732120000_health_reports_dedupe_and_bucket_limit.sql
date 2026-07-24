-- Raise health-reports bucket limit to 50 MB and dedupe external_file_id per user

UPDATE storage.buckets
SET file_size_limit = 52428800
WHERE id = 'health-reports';

CREATE UNIQUE INDEX IF NOT EXISTS health_reports_user_external_file_id_idx
	ON public.health_reports (user_id, external_file_id)
	WHERE external_file_id IS NOT NULL;
