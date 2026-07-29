-- Health Workflow Engine — cleanup and reconciliation
-- Run AFTER applying migration 20260736120000_health_workflow_engine.sql

-- 1. Remove orphan processing queue rows (no matching health_report)
DELETE FROM public.health_report_processing_queue q
WHERE NOT EXISTS (
	SELECT 1 FROM public.health_reports r WHERE r.id = q.report_id
);

-- 2. Reset stuck processing queue rows for failed reports (allow retry)
UPDATE public.health_report_processing_queue q
SET
	status = 'queued',
	started_at = NULL,
	completed_at = NULL,
	error_message = NULL
FROM public.health_reports r
WHERE q.report_id = r.id
	AND r.status IN ('failed', 'uploaded', 'queued')
	AND q.status IN ('failed', 'processing');

-- 3. Sync workflow items from registry where backfill missed updates
UPDATE public.health_workflow_items w
SET
	current_state = CASE
		WHEN r.approval_status = 'rejected' THEN 'REJECTED'
		WHEN r.import_status = 'skipped' THEN 'SKIPPED'
		WHEN r.import_status = 'failed' THEN 'FAILED'
		WHEN r.import_status = 'completed' THEN 'READY'
		WHEN r.approval_status = 'approved'
			AND r.import_status NOT IN ('completed', 'skipped') THEN 'APPROVED'
		WHEN r.discovery_category = 'needs_review'
			AND r.approval_status = 'pending' THEN 'PENDING_REVIEW'
		ELSE w.current_state
	END,
	approval_status = COALESCE(r.approval_status, w.approval_status),
	failure_reason = r.error_message,
	updated_at = NOW(),
	completed_at = CASE
		WHEN r.import_status = 'completed' THEN COALESCE(w.completed_at, NOW())
		ELSE w.completed_at
	END
FROM public.connector_document_registry r
WHERE w.registry_id = r.id
	AND r.connector_id = 'google-drive';

-- 4. Link workflow items to health_reports where missing
UPDATE public.health_workflow_items w
SET
	report_id = r.health_report_id,
	updated_at = NOW()
FROM public.connector_document_registry r
WHERE w.registry_id = r.id
	AND w.report_id IS NULL
	AND r.health_report_id IS NOT NULL;

-- 5. Remove duplicate workflow items (keep newest per registry_id)
DELETE FROM public.health_workflow_items a
USING public.health_workflow_items b
WHERE a.registry_id IS NOT NULL
	AND a.registry_id = b.registry_id
	AND a.created_at < b.created_at;

-- 6. Delete mock-OCR completed reports with zero metrics (optional — dev cleanup)
-- DELETE FROM public.health_reports
-- WHERE status = 'completed'
--   AND (parsed_data->'metrics' IS NULL OR jsonb_array_length(parsed_data->'metrics') = 0)
--   AND ocr_provider = 'mock';
