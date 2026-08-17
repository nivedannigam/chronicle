-- Processing pipeline fields for uploaded health reports

ALTER TABLE public.health_reports
	ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued',
	ADD COLUMN IF NOT EXISTS extracted_text TEXT,
	ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS processing_error TEXT;

ALTER TABLE public.health_reports
	DROP CONSTRAINT IF EXISTS health_reports_status_check;

UPDATE public.health_reports
SET status = 'completed'
WHERE status = 'ready';

UPDATE public.health_reports
SET status = 'failed'
WHERE status NOT IN (
	'uploaded',
	'queued',
	'processing',
	'parsed',
	'completed',
	'failed'
);

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

CREATE INDEX IF NOT EXISTS health_reports_status_idx
	ON public.health_reports(status);

DROP POLICY IF EXISTS "Users can update own health reports" ON public.health_reports;
CREATE POLICY "Users can update own health reports"
	ON public.health_reports
	FOR UPDATE
	TO authenticated
	USING (auth.uid() = user_id)
	WITH CHECK (auth.uid() = user_id);

-- Processing queue (one row per report awaiting or completing processing)
CREATE TABLE IF NOT EXISTS public.health_report_processing_queue (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	report_id UUID NOT NULL UNIQUE REFERENCES public.health_reports(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	status TEXT NOT NULL DEFAULT 'queued',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	started_at TIMESTAMPTZ,
	completed_at TIMESTAMPTZ,
	error_message TEXT
);

ALTER TABLE public.health_report_processing_queue
	DROP CONSTRAINT IF EXISTS health_report_processing_queue_status_check;

UPDATE public.health_report_processing_queue
SET status = 'completed'
WHERE status = 'ready';

UPDATE public.health_report_processing_queue
SET status = 'failed'
WHERE status NOT IN (
	'uploaded',
	'queued',
	'processing',
	'parsed',
	'completed',
	'failed'
);

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

CREATE INDEX IF NOT EXISTS health_report_processing_queue_status_idx
	ON public.health_report_processing_queue(status);

CREATE INDEX IF NOT EXISTS health_report_processing_queue_user_id_idx
	ON public.health_report_processing_queue(user_id);

ALTER TABLE public.health_report_processing_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own processing queue items" ON public.health_report_processing_queue;
CREATE POLICY "Users can view own processing queue items"
	ON public.health_report_processing_queue
	FOR SELECT
	TO authenticated
	USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own processing queue items" ON public.health_report_processing_queue;
CREATE POLICY "Users can insert own processing queue items"
	ON public.health_report_processing_queue
	FOR INSERT
	TO authenticated
	WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own processing queue items" ON public.health_report_processing_queue;
CREATE POLICY "Users can update own processing queue items"
	ON public.health_report_processing_queue
	FOR UPDATE
	TO authenticated
	USING (auth.uid() = user_id)
	WITH CHECK (auth.uid() = user_id);
