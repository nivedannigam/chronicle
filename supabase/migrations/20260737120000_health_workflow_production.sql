-- Production health workflow: observability, idempotency, granular stages

ALTER TABLE public.health_workflow_items
	ADD COLUMN IF NOT EXISTS stage_started_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS stage_finished_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS failed_stage TEXT,
	ADD COLUMN IF NOT EXISTS last_error_detail JSONB,
	ADD COLUMN IF NOT EXISTS progress JSONB NOT NULL DEFAULT '{}'::jsonb,
	ADD COLUMN IF NOT EXISTS worker TEXT;

-- One workflow instance per Drive file per user
CREATE UNIQUE INDEX IF NOT EXISTS health_workflow_items_user_external_file_uidx
	ON public.health_workflow_items(user_id, external_file_id)
	WHERE external_file_id IS NOT NULL;

-- Expand allowed lifecycle states (legacy + granular production stages)
ALTER TABLE public.health_workflow_items
	DROP CONSTRAINT IF EXISTS health_workflow_items_state_check;

ALTER TABLE public.health_workflow_items
	ADD CONSTRAINT health_workflow_items_state_check CHECK (
		current_state IN (
			'DISCOVERED',
			'QUEUED',
			'DOWNLOADING',
			'IMPORTING',
			'OCR',
			'PARSING',
			'INDEXING',
			'PROCESSING',
			'OCR_COMPLETE',
			'PARSED',
			'PENDING_REVIEW',
			'APPROVED',
			'READY',
			'FAILED',
			'SKIPPED',
			'REJECTED'
		)
	);

-- Normalize legacy in-flight rows to granular states
UPDATE public.health_workflow_items
SET current_state = 'OCR'
WHERE current_state = 'PROCESSING';

UPDATE public.health_workflow_items
SET current_state = 'OCR'
WHERE current_state = 'OCR_COMPLETE';

UPDATE public.health_workflow_items
SET current_state = 'PARSING'
WHERE current_state = 'PARSED';

CREATE INDEX IF NOT EXISTS health_workflow_items_user_failed_idx
	ON public.health_workflow_items(user_id, current_state)
	WHERE current_state = 'FAILED';
