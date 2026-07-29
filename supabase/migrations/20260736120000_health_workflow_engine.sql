-- Chronicle Health Workflow Engine — single source of truth for report lifecycle

CREATE TABLE IF NOT EXISTS public.health_workflow_items (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	registry_id UUID REFERENCES public.connector_document_registry(id) ON DELETE SET NULL,
	report_id UUID REFERENCES public.health_reports(id) ON DELETE SET NULL,
	family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	external_file_id TEXT,
	file_name TEXT,
	current_state TEXT NOT NULL DEFAULT 'DISCOVERED',
	previous_state TEXT,
	failure_reason TEXT,
	retry_count INTEGER NOT NULL DEFAULT 0,
	discovery_category TEXT,
	approval_status TEXT NOT NULL DEFAULT 'pending',
	metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	completed_at TIMESTAMPTZ,
	CONSTRAINT health_workflow_items_state_check CHECK (
		current_state IN (
			'DISCOVERED',
			'QUEUED',
			'PROCESSING',
			'OCR_COMPLETE',
			'PARSED',
			'PENDING_REVIEW',
			'APPROVED',
			'IMPORTING',
			'READY',
			'FAILED',
			'SKIPPED',
			'REJECTED'
		)
	),
	CONSTRAINT health_workflow_items_approval_check CHECK (
		approval_status IN ('pending', 'approved', 'rejected')
	)
);

CREATE UNIQUE INDEX IF NOT EXISTS health_workflow_items_registry_id_uidx
	ON public.health_workflow_items(registry_id)
	WHERE registry_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS health_workflow_items_report_id_uidx
	ON public.health_workflow_items(report_id)
	WHERE report_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS health_workflow_items_user_state_idx
	ON public.health_workflow_items(user_id, current_state);

CREATE INDEX IF NOT EXISTS health_workflow_items_user_member_idx
	ON public.health_workflow_items(user_id, family_member_id);

CREATE TABLE IF NOT EXISTS public.health_workflow_events (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	workflow_item_id UUID NOT NULL REFERENCES public.health_workflow_items(id) ON DELETE CASCADE,
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	from_state TEXT,
	to_state TEXT NOT NULL,
	event_type TEXT NOT NULL,
	payload JSONB NOT NULL DEFAULT '{}'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS health_workflow_events_item_idx
	ON public.health_workflow_events(workflow_item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS health_workflow_events_user_idx
	ON public.health_workflow_events(user_id, created_at DESC);

ALTER TABLE public.health_workflow_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_workflow_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own workflow items" ON public.health_workflow_items;
DROP POLICY IF EXISTS "Users can insert own workflow items" ON public.health_workflow_items;
DROP POLICY IF EXISTS "Users can update own workflow items" ON public.health_workflow_items;
DROP POLICY IF EXISTS "Users can view own workflow events" ON public.health_workflow_events;
DROP POLICY IF EXISTS "Users can insert own workflow events" ON public.health_workflow_events;

CREATE POLICY "Users can view own workflow items"
	ON public.health_workflow_items FOR SELECT TO authenticated
	USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow items"
	ON public.health_workflow_items FOR INSERT TO authenticated
	WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflow items"
	ON public.health_workflow_items FOR UPDATE TO authenticated
	USING (auth.uid() = user_id)
	WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own workflow events"
	ON public.health_workflow_events FOR SELECT TO authenticated
	USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workflow events"
	ON public.health_workflow_events FOR INSERT TO authenticated
	WITH CHECK (auth.uid() = user_id);

-- Backfill from existing registry rows (idempotent via registry_id unique index)
INSERT INTO public.health_workflow_items (
	user_id,
	registry_id,
	report_id,
	family_member_id,
	external_file_id,
	file_name,
	current_state,
	approval_status,
	discovery_category,
	failure_reason,
	metadata,
	created_at,
	updated_at,
	completed_at
)
SELECT
	r.user_id,
	r.id,
	r.health_report_id,
	r.family_member_id,
	r.external_file_id,
	r.file_name,
	CASE
		WHEN r.approval_status = 'rejected' THEN 'REJECTED'
		WHEN r.import_status = 'skipped' THEN 'SKIPPED'
		WHEN r.import_status = 'failed' THEN 'FAILED'
		WHEN r.import_status = 'completed' THEN 'READY'
		WHEN r.approval_status = 'approved'
			AND r.import_status NOT IN ('completed', 'skipped') THEN 'APPROVED'
		WHEN r.discovery_category = 'needs_review'
			AND r.approval_status = 'pending' THEN 'PENDING_REVIEW'
		WHEN r.import_status IN ('queued', 'retry') THEN 'QUEUED'
		WHEN r.import_status IN ('downloading', 'imported', 'ocr', 'parsing', 'knowledge_graph') THEN 'IMPORTING'
		ELSE 'DISCOVERED'
	END,
	COALESCE(r.approval_status, 'pending'),
	r.discovery_category,
	r.error_message,
	jsonb_build_object(
		'import_status', r.import_status,
		'registry_status', r.registry_status,
		'backfilled', true
	),
	COALESCE(r.created_at, NOW()),
	COALESCE(r.updated_at, NOW()),
	CASE WHEN r.import_status = 'completed' THEN r.updated_at ELSE NULL END
FROM public.connector_document_registry r
WHERE r.connector_id = 'google-drive'
	AND NOT EXISTS (
		SELECT 1
		FROM public.health_workflow_items w
		WHERE w.registry_id = r.id
	);
