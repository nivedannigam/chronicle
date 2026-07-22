-- Health reports metadata for manually uploaded PDFs

CREATE TABLE IF NOT EXISTS public.health_reports (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	file_name TEXT NOT NULL,
	storage_path TEXT NOT NULL,
	report_date DATE,
	report_type TEXT NOT NULL DEFAULT 'general',
	uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS health_reports_user_id_idx
	ON public.health_reports(user_id);

CREATE INDEX IF NOT EXISTS health_reports_uploaded_at_idx
	ON public.health_reports(uploaded_at DESC);

ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health reports"
	ON public.health_reports
	FOR SELECT
	TO authenticated
	USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health reports"
	ON public.health_reports
	FOR INSERT
	TO authenticated
	WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health reports"
	ON public.health_reports
	FOR DELETE
	TO authenticated
	USING (auth.uid() = user_id);

-- Private bucket for PDF health reports (10 MB limit, PDF only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
	'health-reports',
	'health-reports',
	false,
	10485760,
	ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET
	file_size_limit = EXCLUDED.file_size_limit,
	allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can upload own health report files"
	ON storage.objects
	FOR INSERT
	TO authenticated
	WITH CHECK (
		bucket_id = 'health-reports'
		AND auth.uid()::text = (storage.foldername(name))[1]
	);

CREATE POLICY "Users can read own health report files"
	ON storage.objects
	FOR SELECT
	TO authenticated
	USING (
		bucket_id = 'health-reports'
		AND auth.uid()::text = (storage.foldername(name))[1]
	);

CREATE POLICY "Users can delete own health report files"
	ON storage.objects
	FOR DELETE
	TO authenticated
	USING (
		bucket_id = 'health-reports'
		AND auth.uid()::text = (storage.foldername(name))[1]
	);
