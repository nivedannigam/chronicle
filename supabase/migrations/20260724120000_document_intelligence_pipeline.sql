-- Document Intelligence pipeline: extended status lifecycle and parsed output storage

ALTER TABLE public.health_reports
	ADD COLUMN IF NOT EXISTS parsed_data JSONB,
	ADD COLUMN IF NOT EXISTS ocr_page_count INTEGER,
	ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5, 4);

ALTER TABLE public.health_reports
	DROP CONSTRAINT IF EXISTS health_reports_status_check;

UPDATE public.health_reports
SET status = 'completed'
WHERE status = 'ready';

ALTER TABLE public.health_reports
	ADD CONSTRAINT health_reports_status_check
	CHECK (
		status IN (
			'uploaded',
			'queued',
			'processing',
			'parsed',
			'completed',
			'failed'
		)
	);

ALTER TABLE public.health_report_processing_queue
	DROP CONSTRAINT IF EXISTS health_report_processing_queue_status_check;

UPDATE public.health_report_processing_queue
SET status = 'completed'
WHERE status = 'ready';

ALTER TABLE public.health_report_processing_queue
	ADD CONSTRAINT health_report_processing_queue_status_check
	CHECK (
		status IN (
			'uploaded',
			'queued',
			'processing',
			'parsed',
			'completed',
			'failed'
		)
	);
