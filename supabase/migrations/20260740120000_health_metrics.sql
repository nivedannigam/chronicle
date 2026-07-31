-- Structured health metrics extracted from OCR / parser pipeline

CREATE TABLE IF NOT EXISTS public.health_metrics (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	report_id UUID NOT NULL REFERENCES public.health_reports(id) ON DELETE CASCADE,
	workflow_item_id UUID REFERENCES public.health_workflow_items(id) ON DELETE SET NULL,
	canonical_metric_id TEXT NOT NULL,
	display_name TEXT NOT NULL,
	raw_name TEXT NOT NULL,
	value TEXT NOT NULL,
	numeric_value DOUBLE PRECISION,
	unit TEXT,
	reference_range_raw TEXT,
	reference_lower DOUBLE PRECISION,
	reference_upper DOUBLE PRECISION,
	status TEXT NOT NULL DEFAULT 'unknown',
	category TEXT NOT NULL DEFAULT 'blood',
	report_date DATE,
	observed_at TIMESTAMPTZ NOT NULL,
	confidence DOUBLE PRECISION NOT NULL DEFAULT 0.5,
	source TEXT NOT NULL DEFAULT 'text',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT health_metrics_status_check CHECK (
		status IN ('normal', 'high', 'low', 'borderline', 'critical', 'unknown')
	)
);

CREATE UNIQUE INDEX IF NOT EXISTS health_metrics_report_metric_uidx
	ON public.health_metrics(report_id, canonical_metric_id);

CREATE INDEX IF NOT EXISTS health_metrics_user_observed_idx
	ON public.health_metrics(user_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS health_metrics_user_member_observed_idx
	ON public.health_metrics(user_id, family_member_id, observed_at DESC);

CREATE INDEX IF NOT EXISTS health_metrics_report_idx
	ON public.health_metrics(report_id);

CREATE INDEX IF NOT EXISTS health_metrics_workflow_idx
	ON public.health_metrics(workflow_item_id)
	WHERE workflow_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS health_metrics_canonical_idx
	ON public.health_metrics(user_id, canonical_metric_id, observed_at DESC);

ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own health metrics" ON public.health_metrics;
CREATE POLICY "Users can view own health metrics"
	ON public.health_metrics FOR SELECT TO authenticated
	USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own health metrics" ON public.health_metrics;
CREATE POLICY "Users can insert own health metrics"
	ON public.health_metrics FOR INSERT TO authenticated
	WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own health metrics" ON public.health_metrics;
CREATE POLICY "Users can update own health metrics"
	ON public.health_metrics FOR UPDATE TO authenticated
	USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own health metrics" ON public.health_metrics;
CREATE POLICY "Users can delete own health metrics"
	ON public.health_metrics FOR DELETE TO authenticated
	USING (auth.uid() = user_id);
