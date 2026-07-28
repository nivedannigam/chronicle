-- Content hash for manual upload dedupe (and Drive imports after download)

ALTER TABLE public.health_reports
	ADD COLUMN IF NOT EXISTS file_hash TEXT;

CREATE INDEX IF NOT EXISTS health_reports_user_file_hash_idx
	ON public.health_reports (user_id, file_hash)
	WHERE file_hash IS NOT NULL;
