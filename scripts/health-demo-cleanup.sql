-- One-time cleanup for demo / stale health data after UI migration.
-- Review output before running in production. Does NOT drop tables or buckets.

BEGIN;

-- 1. Reports that used mock OCR and have no usable parsed metrics
--    (safe to delete metadata rows; storage files remain unless you delete separately)
DELETE FROM public.health_reports
WHERE (
	ocr_provider = 'mock'
	OR processing_error ILIKE '%Mock OCR%'
	OR (ocr_metadata->>'usedMockFallback')::boolean IS TRUE
)
AND (
	parsed_data IS NULL
	OR parsed_data->'metrics' IS NULL
	OR jsonb_array_length(COALESCE(parsed_data->'metrics', '[]'::jsonb)) = 0
);

-- 2. Failed rows with no storage path (orphaned queue artifacts)
DELETE FROM public.health_report_processing_queue
WHERE report_id NOT IN (SELECT id FROM public.health_reports);

-- 3. Duplicate Drive imports for the same external file (keep newest)
WITH ranked AS (
	SELECT
		id,
		ROW_NUMBER() OVER (
			PARTITION BY user_id, external_file_id
			ORDER BY uploaded_at DESC
		) AS rn
	FROM public.health_reports
	WHERE external_file_id IS NOT NULL
)
DELETE FROM public.health_reports
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 4. Stale in-memory knowledge graph cache rows (optional persist table)
DELETE FROM public.health_knowledge_graphs
WHERE generated_at < NOW() - INTERVAL '30 days';

COMMIT;

-- Post-cleanup validation (run manually):
-- SELECT status, COUNT(*) FROM public.health_reports GROUP BY status;
-- SELECT COUNT(*) FROM public.health_reports WHERE parsed_data->'metrics' IS NOT NULL;
