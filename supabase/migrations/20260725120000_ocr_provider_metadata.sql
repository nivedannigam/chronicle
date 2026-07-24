-- OCR provider metadata for document intelligence pipeline

ALTER TABLE public.health_reports
	ADD COLUMN IF NOT EXISTS ocr_provider TEXT,
	ADD COLUMN IF NOT EXISTS ocr_processing_time_ms INTEGER,
	ADD COLUMN IF NOT EXISTS ocr_metadata JSONB;

CREATE INDEX IF NOT EXISTS health_reports_ocr_provider_idx
	ON public.health_reports(ocr_provider);
