-- M16.2–M16.5 Health Import Pipeline extensions

ALTER TABLE public.connector_document_registry
	ADD COLUMN IF NOT EXISTS family_member_id UUID REFERENCES public.family_members(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS folder_path TEXT,
	ADD COLUMN IF NOT EXISTS discovery_category TEXT,
	ADD COLUMN IF NOT EXISTS discovery_confidence NUMERIC(5, 2),
	ADD COLUMN IF NOT EXISTS discovery_reason TEXT,
	ADD COLUMN IF NOT EXISTS sha256_checksum TEXT,
	ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
	ADD COLUMN IF NOT EXISTS detected_patient TEXT,
	ADD COLUMN IF NOT EXISTS detected_report_date DATE,
	ADD COLUMN IF NOT EXISTS detected_report_type TEXT;

CREATE INDEX IF NOT EXISTS connector_document_registry_category_idx
	ON public.connector_document_registry(user_id, discovery_category);

CREATE INDEX IF NOT EXISTS connector_document_registry_approval_idx
	ON public.connector_document_registry(user_id, approval_status);

CREATE TABLE IF NOT EXISTS public.health_discovery_runs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	connector_id TEXT NOT NULL DEFAULT 'google-drive',
	mode TEXT NOT NULL DEFAULT 'manual',
	status TEXT NOT NULL DEFAULT 'running',
	started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	completed_at TIMESTAMPTZ,
	folders_scanned INTEGER NOT NULL DEFAULT 0,
	files_scanned INTEGER NOT NULL DEFAULT 0,
	medical_count INTEGER NOT NULL DEFAULT 0,
	review_count INTEGER NOT NULL DEFAULT 0,
	ignored_count INTEGER NOT NULL DEFAULT 0,
	imported_count INTEGER NOT NULL DEFAULT 0,
	duplicate_count INTEGER NOT NULL DEFAULT 0,
	error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.health_knowledge_graphs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
	family_member_id UUID REFERENCES public.family_members(id) ON DELETE CASCADE,
	graph_json JSONB NOT NULL DEFAULT '{}'::jsonb,
	version TEXT NOT NULL DEFAULT '1',
	built_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (user_id, family_member_id)
);

ALTER TABLE public.health_discovery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_knowledge_graphs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own discovery runs" ON public.health_discovery_runs;
CREATE POLICY "Users manage own discovery runs"
	ON public.health_discovery_runs FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own knowledge graphs" ON public.health_knowledge_graphs;
CREATE POLICY "Users manage own knowledge graphs"
	ON public.health_knowledge_graphs FOR ALL TO authenticated
	USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
